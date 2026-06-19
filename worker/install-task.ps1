# Registers the QCB worker as a Windows scheduled task that starts at logon
# and keeps polling. Run from the worker directory (uses $PSScriptRoot).
#   powershell -ExecutionPolicy Bypass -File install-task.ps1

$py = (Get-Command pythonw.exe -ErrorAction Stop).Source
$dir = $PSScriptRoot

$action = New-ScheduledTaskAction -Execute $py -Argument 'worker.py' -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName 'QCB Worker' -Action $action -Trigger $trigger `
  -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName 'QCB Worker'
Start-Sleep -Seconds 3

Get-ScheduledTask -TaskName 'QCB Worker' | Select-Object TaskName, State | Format-Table -Auto
'pythonw running:'
Get-Process pythonw -ErrorAction SilentlyContinue | Select-Object Id, StartTime | Format-Table -Auto
