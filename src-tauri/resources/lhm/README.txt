LibreHardwareMonitor staging directory
=======================================

Sentinel can optionally bundle LibreHardwareMonitor (MPL-2.0) here so that
CPU and memory temperatures become available without the user having to
install LHM separately.

To populate this folder, run from the repository root:

    pwsh ./scripts/setup-lhm.ps1

The script downloads the latest LHM release, extracts it, and places
LICENSE-LibreHardwareMonitor.txt alongside. After that, Sentinel's bundler
(see tauri.conf.json -> bundle.resources) will include the contents in the
installer.

If this directory is empty at build time the bundle still succeeds; the LHM
auto-start UI in Settings will then show "binary not bundled" and the user
can either run the script and rebuild, or install LHM manually.

Note: The LHM binaries themselves are *not* tracked by git (see .gitignore).
Only this README is committed so the directory exists in fresh clones.
