# Releasing a Version

Each published version has four matching identifiers:

1. The `version` in `package.json`
2. The `expo.version` in `app.json`
3. A section in `CHANGELOG.md`
4. A Git tag such as `v1.1.0`

## Choose the next version

Use Semantic Versioning:

- Patch: `1.0.0` to `1.0.1` for bug fixes and small visual changes
- Minor: `1.0.0` to `1.1.0` for a new page or feature
- Major: `1.0.0` to `2.0.0` for a major redesign or breaking change

## Publish an update

1. Update the version in `package.json` and `app.json`.
2. Add a dated section near the top of `CHANGELOG.md` describing the changes.
3. Validate the app:

```powershell
.\node_modules\.bin\expo.cmd export --platform web
```

4. Commit the version:

```powershell
git add .
git commit -m "Release v1.1.0"
```

5. Create an annotated tag and push the commit and tag:

```powershell
git tag -a v1.1.0 -m "CvSU Admission Guide v1.1.0"
git push origin main
git push origin v1.1.0
```

Replace `1.1.0` with the version being released. GitHub will show each snapshot under **Tags**, and a release can be created from any tag without changing its files.

## Daily development

Use normal descriptive commits while working. Create a version tag only when the update is ready to preserve as a recognizable release.
