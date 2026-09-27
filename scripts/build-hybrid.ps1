# BeatCheat Pro — Windows Hybrid Build

Prerequisites:
- Windows x64
- Visual Studio with C++ desktop development tools
- Adobe UXP Hybrid Plugin SDK extracted locally
- Set `UXP_HYBRID_SDK_ROOT` to the SDK root directory

From PowerShell:

```powershell
$env:UXP_HYBRID_SDK_ROOT = "C:\path\to\uxp-hybrid-plugin-sdk-main"
.\scripts\build-hybrid.ps1
```

The script builds **Release|x64**, then places:

`dist\win\x64\beatcheatpro_dsp.uxpaddon`

Release is intentional: Adobe documents that Debug builds can depend on Visual Studio debug runtimes that are absent on clean Windows installations.
