# Script tối ưu Bluetooth Keyboard & Mouse cho Windows
# Tắt chế độ tiết kiệm điện (Power Management / Selective Suspend) trên card Bluetooth và bàn phím/chuột

Write-Host "Dang toi uu hoa thiet bi Bluetooth..." -ForegroundColor Cyan

# 1. Tắt Power Saving trên WMI MSPower_DeviceEnable
try {
    $devices = Get-CimInstance -ClassName MSPower_DeviceEnable -Namespace root\wmi | Where-Object {
        $_.InstanceName -like "*8087*" -or 
        $_.InstanceName -like "*788712aa7bec*" -or 
        $_.InstanceName -like "*e45f30fd4a3f*" -or
        $_.InstanceName -like "*BTHLE*" -or
        $_.InstanceName -like "*BTH*"
    }

    foreach ($dev in $devices) {
        $dev.Enable = $false
        Set-CimInstance -CimInstance $dev -ErrorAction SilentlyContinue
        Write-Host "Da tat tiet kiem dien cho: $($dev.InstanceName)" -ForegroundColor Green
    }
} catch {
    Write-Host "Loi khi cau hinh WMI: $_" -ForegroundColor Yellow
}

# 2. Tat Power Management trong Registry Driver PnP
$pnpKeys = Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Enum\USB" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -eq "Device Parameters" }
foreach ($k in $pnpKeys) {
    if ($k.Name -like "*VID_8087*") {
        Set-ItemProperty -Path $k.PSPath -Name "DeviceSelectiveSuspended" -Value 0 -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $k.PSPath -Name "SelectiveSuspendEnabled" -Value 0 -ErrorAction SilentlyContinue
    }
}

Write-Host "`nHoan tat toi uu Bluetooth! Hay go thu phim de kiem tra." -ForegroundColor Green

