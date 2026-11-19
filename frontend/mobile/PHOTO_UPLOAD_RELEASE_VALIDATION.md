# Photo upload release validation

## Staging build

- Android EAS build: [b35e140b-99e7-44a0-85b5-ed472cd3c027](https://expo.dev/accounts/bryanyaneza/projects/parknquik-mobile/builds/b35e140b-99e7-44a0-85b5-ed472cd3c027), `staging` profile, submitted 2026-11-18. Status: queued at last check. Backend: `https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1` from `eas.json`.
- iOS staging build: submission blocked. EAS has no Apple credentials suitable for internal distribution; the noninteractive build cannot configure them. No iOS build ID or installed-app result.

## Local checks

- Mobile Jest: 23 suites, 153 tests passed with `--watchman=false --runInBand`.
- TypeScript: `tsc --noEmit` passed.
- Expo dependency check: passed after installing from the existing lockfile. The check used Expo's local version map because the well-known versions endpoint was unavailable.
- Android and iOS Metro exports: both passed. These do not verify native uploads.

## Installed-app checks

No installed device results yet. The release gate remains open. On the Android staging build, record the device model and OS version, then check:

1. Profile camera and gallery uploads. Revisit the profile and restart the app to confirm persistence.
2. Listing create and edit uploads with JPEG, PNG, WebP, and an unsupported image format if the picker supplies one. Verify the saved photos after navigation and restart.
3. Shared slot photo uploader with camera and gallery images; verify after navigation and restart.
4. A failed storage transfer must not call backend confirmation. For a partial listing upload, confirm that successful photos remain and a failed photo can be added through edit.

Record any failure as image preparation, signing, storage transfer, confirmation, or listing attachment. Repeat the installed-app checks on iOS when a signed build and device are available.

## Production gate

After staging device checks pass, build with the `production` profile and run a small upload smoke test through internal distribution. Record the production build ID, backend, device, and upload results before public release. Do not mark uploads release ready from mocked tests or Metro exports alone.
