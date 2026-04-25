//! Logical drive (`C:`) → physical drive number + model name resolver.
//!
//! Two IOCTLs are used, both on the volume handle (`\\.\C:`), neither requires
//! Administrator:
//!
//! - `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS` returns a `VOLUME_DISK_EXTENTS`
//!   with the underlying physical disk number(s). For non-spanned volumes the
//!   first extent's `DiskNumber` identifies the drive.
//! - `IOCTL_STORAGE_QUERY_PROPERTY` with `StorageDeviceProperty` returns a
//!   `STORAGE_DEVICE_DESCRIPTOR` whose `ProductIdOffset` points to the model
//!   string (e.g. "CT2000T500SSD8"), matching how LHM labels storage nodes.

use std::os::windows::ffi::OsStrExt;
use windows::core::PCWSTR;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};
use windows::Win32::System::IO::DeviceIoControl;

const IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS: u32 = 0x0056_0000;
const IOCTL_STORAGE_QUERY_PROPERTY: u32 = 0x002D_1400;
const PROPERTY_STANDARD_QUERY: u32 = 0;
const STORAGE_DEVICE_PROPERTY: u32 = 0;

#[repr(C)]
struct DiskExtent {
    disk_number: u32,
    starting_offset: i64,
    extent_length: i64,
}

#[repr(C)]
struct VolumeDiskExtents {
    number_of_disk_extents: u32,
    extents: [DiskExtent; 4], // up to 4 extents fits the common single-disk case
}

#[repr(C)]
struct StoragePropertyQuery {
    property_id: u32,
    query_type: u32,
    additional_parameters: [u8; 1],
}

#[repr(C)]
struct StorageDeviceDescriptor {
    version: u32,
    size: u32,
    device_type: u8,
    device_type_modifier: u8,
    removable_media: u8,
    command_queueing: u8,
    vendor_id_offset: u32,
    product_id_offset: u32,
    product_revision_offset: u32,
    serial_number_offset: u32,
    bus_type: i32,
    raw_properties_length: u32,
    // raw_device_properties: [u8; 1] follows but we read directly from the buffer
}

/// Open a volume path like `\\.\C:` (no trailing backslash) for IOCTL queries.
unsafe fn open_volume(letter_with_colon: &str) -> Option<windows::Win32::Foundation::HANDLE> {
    // `letter_with_colon` looks like "C:" — we strip any trailing backslash and
    // prepend the device namespace prefix.
    let trimmed = letter_with_colon.trim_end_matches('\\');
    if trimmed.len() < 2 || !trimmed.ends_with(':') {
        return None;
    }
    let path = format!(r"\\.\{}", trimmed);
    let wide: Vec<u16> = std::ffi::OsStr::new(&path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    CreateFileW(
        PCWSTR(wide.as_ptr()),
        0,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )
    .ok()
}

fn phys_drive_of(handle: windows::Win32::Foundation::HANDLE) -> Option<u32> {
    unsafe {
        let mut out = std::mem::MaybeUninit::<VolumeDiskExtents>::zeroed();
        let mut returned = 0u32;
        DeviceIoControl(
            handle,
            IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS,
            None,
            0,
            Some(out.as_mut_ptr() as _),
            std::mem::size_of::<VolumeDiskExtents>() as u32,
            Some(&mut returned),
            None,
        )
        .ok()?;
        if returned == 0 {
            return None;
        }
        let extents = out.assume_init();
        if extents.number_of_disk_extents == 0 {
            return None;
        }
        Some(extents.extents[0].disk_number)
    }
}

fn model_of(handle: windows::Win32::Foundation::HANDLE) -> Option<String> {
    unsafe {
        // Single buffer for both the input query and the output descriptor.
        let mut buf = vec![0u8; 1024];
        let query = buf.as_mut_ptr() as *mut StoragePropertyQuery;
        (*query).property_id = STORAGE_DEVICE_PROPERTY;
        (*query).query_type = PROPERTY_STANDARD_QUERY;

        let mut returned = 0u32;
        DeviceIoControl(
            handle,
            IOCTL_STORAGE_QUERY_PROPERTY,
            Some(buf.as_ptr() as _),
            buf.len() as u32,
            Some(buf.as_mut_ptr() as _),
            buf.len() as u32,
            Some(&mut returned),
            None,
        )
        .ok()?;
        if (returned as usize) < std::mem::size_of::<StorageDeviceDescriptor>() {
            return None;
        }

        let desc = &*(buf.as_ptr() as *const StorageDeviceDescriptor);
        let pid_offset = desc.product_id_offset as usize;
        if pid_offset == 0 || pid_offset >= buf.len() {
            return None;
        }
        // Null-terminated ASCII at pid_offset.
        let bytes = &buf[pid_offset..];
        let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
        let s = std::str::from_utf8(&bytes[..end]).ok()?.trim().to_string();
        if s.is_empty() {
            None
        } else {
            Some(s)
        }
    }
}

/// Returns `(phys_drive_number, model_name)` for a logical drive label like `C:`.
/// Both fields may be `None` independently if the corresponding IOCTL fails.
pub fn resolve(letter_with_colon: &str) -> (Option<u32>, Option<String>) {
    unsafe {
        let handle = match open_volume(letter_with_colon) {
            Some(h) => h,
            None => return (None, None),
        };
        let phys = phys_drive_of(handle);
        let model = model_of(handle);
        let _ = CloseHandle(handle);
        (phys, model)
    }
}
