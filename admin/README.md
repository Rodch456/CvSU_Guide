# CvSU Admission Content Admin

The admin website and the Expo guide share one published content store. Admins can edit FAQs, program choices, tracks and strands, and each existing admission step’s title, summary, instructions, requirements, documents and location. The Programs editor also controls which programs show the Interview step.

In **Tracks and strands**, open a track to check which programs its applicants can choose. **ALS Passer** has its own assignments and appears when the applicant chooses **ALS Completer**. **Programs** manages the shared catalog. Assign new program names to the appropriate tracks before publishing.

In **Academic statuses**, add or select a status and edit its name and description. Offer all standard tracks or select the specific tracks applicants see next. Program choices follow the chosen track’s eligibility list. Enable a step’s custom requirements to replace its default checklist for that status. Leave the custom list empty to offer a step without checklist items. Select **Publish changes** to apply the edits to the applicant guide.

To remove a status, select it, choose **Delete academic status**, and confirm. Publish the draft to remove it from the applicant guide. At least one status must remain available.

In **Admission steps**, choose a step and use **Add requirement**, **Move up**, and **Move down** to arrange its checklist from first to last. The same controls are available for custom checklists in **Academic statuses**.

Use **Add admission step** to add a step to both applicant journeys. Enter a title and summary, add any instructions and requirements, then use **Move step earlier** or **Move step later** to position it. The built-in stages keep their relative order, and Interview remains limited to eligible programs. Custom steps may be deleted. Apps need a version that supports added steps to display these changes.

In **Admission steps → Admission Examination**, enable **Limit reapplication to selected programs** to choose which programs to offer after a failed result. An empty selection offers no reapplication programs. Use **Tracks and strands allowed to reapply** to follow regular eligibility, open these programs to every track, or open them only to selected tracks. The all-tracks and selected-tracks modes allow programs outside the applicant’s regular track eligibility. The applicant’s original program is always excluded.

In **Admission steps → Admission Examination → Examination venue**, select ICON, Rolle Hall, or the College of Criminal Justice. The selected venue appears on the applicant map and in the examination step after publishing. Route waypoints are configured in `src/ExpoApp.js`, and previously saved pins still take precedence over the destinations in that file.

When the server first opens a published file from before program eligibility, it loads the supplied catalog and eligibility lists, preserves existing track descriptions where names match, and keeps any additional tracks with an empty eligible list until an admin assigns programs.

**Change history** shows when each publish took place and which entries changed. It starts recording from the first publish after this feature is installed. The published content file also contains the history, so back it up to retain both.

In **Campus trivia**, edit the facts shown in FAQs and publish the changes to send them to applicants. The campus attire and uniform guide is bundled with the applicant app.

**Active app installations** counts distinct native app installations that checked in during the last 30 days. A check-in contains a randomly generated installation identifier, with no applicant profile fields. Web sessions and older app releases do not check in. A disconnected or uninstalled app stops counting after its last check-in ages out. Use **Reload** on the dashboard to refresh the count. The check-in file is stored next to `ADMISSION_DATA_FILE`, so it uses the same persistent volume.

## Run locally

Use Node.js 20.12 or newer. Set `ADMISSION_ADMIN_USERNAME` and `ADMISSION_ADMIN_PASSWORD` in the server environment or in the ignored `admin/.env.local` file. The username defaults to `Admin`. To create a password from PowerShell and start the server, run:

```powershell
$env:ADMISSION_ADMIN_PASSWORD = [guid]::NewGuid().ToString('N')
Write-Output $env:ADMISSION_ADMIN_PASSWORD
npm run admin
```

Open `http://127.0.0.1:4100` and sign in with your configured username and password. Edit a section and select **Publish changes** to save all edits. The server starts with the content bundled in the app and saves published edits to `admin/data/published.json`.

To try updates in Expo web, run these commands in another PowerShell terminal.

```powershell
$env:EXPO_PUBLIC_ADMISSION_CONTENT_URL = 'http://127.0.0.1:4100/api/content'
npm run web
```

To use a physical device, use an HTTPS endpoint reachable by the device. A phone’s loopback address points to the phone itself.

## Connect a distributed app

1. Run `npm run admin` on a Node.js host with a persistent disk. Set `ADMISSION_DATA_FILE` to a writable file on that disk, `ADMISSION_ADMIN_PASSWORD` to a secret generated for that environment, and `HOST` and `PORT` to the values your host expects. Run one instance against the content file.
2. Put the site behind HTTPS. On a public deployment, configure the proxy to rate-limit requests to `/api/admin/content`. Back up the published content file.
3. Set `EXPO_PUBLIC_ADMISSION_CONTENT_URL` in the Expo build environment to the public HTTPS URL ending in `/api/content`. This URL is public. Keep the admin password in the server environment.
4. Build and distribute an app version with this integration. Later publishes appear on subsequent app launches without rebuilding. In the app, open **Profile → Check for content updates** to apply a publish immediately. The app uses its last downloaded copy offline, or the bundled guide on a first launch without connectivity.
