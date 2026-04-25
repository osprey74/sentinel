//! NVMe SMART/Health Information Log reader (Windows, no admin required).
//!
//! Opens `\\.\PhysicalDriveN` with `dwDesiredAccess = 0` (FILE_READ_ATTRIBUTES),
//! then issues `IOCTL_STORAGE_QUERY_PROPERTY` with
//! `StorageDeviceProtocolSpecificProperty` to fetch NVMe Log Page 0x02. The
//! Composite Temperature is at bytes 1-2 (little-endian, in Kelvin).
//!
//! References:
//! - NVMe spec section 5.14.1.2 (SMART / Health Information Log Page)
//! - https://learn.microsoft.com/windows/win32/api/winioctl/ni-winioctl-ioctl_storage_query_property

use crate::metrics::DiskTemp;
use std::os::windows::ffi::OsStrExt;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, GENERIC_READ};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};
use windows::Win32::System::IO::DeviceIoControl;

// PropertyId / QueryType (from ntddstor.h)
const PROPERTY_STANDARD_QUERY: u32 = 0;
const STORAGE_DEVICE_PROTOCOL_SPECIFIC_PROPERTY: u32 = 50;

// Protocol enums (from ntddstor.h)
const PROTOCOL_TYPE_NVME: u32 = 3;
const NVME_DATA_TYPE_LOG_PAGE: u32 = 2;
const NVME_LOG_PAGE_HEALTH_INFO: u32 = 0x02;
const NVME_LOG_DATA_SIZE: u32 = 512;

// IOCTL_STORAGE_QUERY_PROPERTY = CTL_CODE(IOCTL_STORAGE_BASE, 0x0500, METHOD_BUFFERED, FILE_ANY_ACCESS)
const IOCTL_STORAGE_QUERY_PROPERTY: u32 = 0x002D_1400;

#[repr(C)]
struct StorageProtocolSpecificData {
    protocol_type: u32,
    data_type: u32,
    protocol_data_request_value: u32,
    protocol_data_request_sub_value: u32,
    protocol_data_offset: u32,
    protocol_data_length: u32,
    fixed_protocol_return_data: u32,
    protocol_data_request_sub_value2: u32,
    protocol_data_request_sub_value3: u32,
    protocol_data_request_sub_value4: u32,
}

#[repr(C)]
struct StoragePropertyQueryWithProtocolData {
    property_id: u32,
    query_type: u32,
    protocol_data: StorageProtocolSpecificData,
}

fn read_nvme_temp(drive_index: u32) -> Option<f32> {
    let path = format!(r"\\.\PhysicalDrive{}", drive_index);
    let wide: Vec<u16> = std::ffi::OsStr::new(&path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        // Access mode 0 grants FILE_READ_ATTRIBUTES, sufficient for IOCTL queries
        // and does NOT require Administrator on Windows 10/11.
        let handle = CreateFileW(
            PCWSTR(wide.as_ptr()),
            0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None,
        )
        .ok()?;

        // Single buffer used for both input (the query) and output (the descriptor + log).
        let header_size = std::mem::size_of::<StoragePropertyQueryWithProtocolData>();
        let buf_size = header_size + NVME_LOG_DATA_SIZE as usize;
        let mut buf = vec![0u8; buf_size];

        let query = buf.as_mut_ptr() as *mut StoragePropertyQueryWithProtocolData;
        (*query).property_id = STORAGE_DEVICE_PROTOCOL_SPECIFIC_PROPERTY;
        (*query).query_type = PROPERTY_STANDARD_QUERY;
        (*query).protocol_data.protocol_type = PROTOCOL_TYPE_NVME;
        (*query).protocol_data.data_type = NVME_DATA_TYPE_LOG_PAGE;
        (*query).protocol_data.protocol_data_request_value = NVME_LOG_PAGE_HEALTH_INFO;
        (*query).protocol_data.protocol_data_offset =
            std::mem::size_of::<StorageProtocolSpecificData>() as u32;
        (*query).protocol_data.protocol_data_length = NVME_LOG_DATA_SIZE;

        let mut returned = 0u32;
        let result = DeviceIoControl(
            handle,
            IOCTL_STORAGE_QUERY_PROPERTY,
            Some(buf.as_ptr() as _),
            buf.len() as u32,
            Some(buf.as_mut_ptr() as _),
            buf.len() as u32,
            Some(&mut returned),
            None,
        );

        let _ = CloseHandle(handle);

        if result.is_err() || returned == 0 {
            return None;
        }

        // Output layout: STORAGE_PROTOCOL_DATA_DESCRIPTOR { Version: u32, Size: u32, Data: STORAGE_PROTOCOL_SPECIFIC_DATA }
        // followed by the NVMe log at (start_of_descriptor + 8 + protocol_data_offset).
        // Since Version+Size = 8 bytes precede protocol_data, the log offset in our buffer
        // is 8 + ProtocolDataOffset (which we set to sizeof(STORAGE_PROTOCOL_SPECIFIC_DATA)).
        let proto_data_offset = (*query).protocol_data.protocol_data_offset as usize;
        let log_start = 8 + proto_data_offset;
        if log_start + 3 > buf.len() {
            return None;
        }

        let temp_k = u16::from_le_bytes([buf[log_start + 1], buf[log_start + 2]]);
        if temp_k == 0 {
            return None;
        }
        let celsius = temp_k as f32 - 273.15;
        // Sanity bounds: NVMe drives shouldn't read below freezing or above boiling
        if celsius < -20.0 || celsius > 150.0 {
            return None;
        }
        Some(celsius)
    }
}

#[allow(dead_code)]
const _GENERIC_READ_UNUSED: u32 = GENERIC_READ.0;

pub fn collect_nvme_temps() -> Vec<DiskTemp> {
    (0..16u32)
        .filter_map(|i| {
            read_nvme_temp(i).map(|t| DiskTemp {
                label: format!("NVMe {}", i),
                temp: t,
            })
        })
        .collect()
}

/// Returns `(phys_drive_number, celsius)` pairs for every NVMe device
/// reachable on this system. Used by `lib.rs` to match a logical drive to its
/// SMART temperature.
pub fn collect_nvme_temps_indexed() -> Vec<(u32, f32)> {
    (0..16u32)
        .filter_map(|i| read_nvme_temp(i).map(|t| (i, t)))
        .collect()
}
