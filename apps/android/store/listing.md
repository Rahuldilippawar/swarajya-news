# Google Play listing

Draft text and form answers for the Play Console. Management should review the wording; the form answers describe
what the app actually does and must be updated if that changes.

## Graphics (in this folder)

| Asset | File | Play requirement |
| --- | --- | --- |
| App icon | `icon-512.png` | 512 × 512 PNG |
| Feature graphic | `feature-graphic.png` | 1024 × 500 |
| Phone screenshots | take from a real phone after launch data exists | 2–8, at least 1080 px on the short side recommended |

## Store listing

**App name** (max 30): `स्वराज्य न्यूज – Swarajya News`

**Short description** (max 80):
`जिल्हा, तालुका आणि गावातील ताज्या मराठी बातम्या आणि व्हिडिओ`

**Full description**:

```
स्वराज्य न्यूज — तुमच्या जिल्ह्यातील, तालुक्यातील आणि गावातील विश्वासार्ह मराठी बातम्या.

• ताज्या आणि ब्रेकिंग बातम्या
• स्वराज्य न्यूजच्या अधिकृत YouTube चॅनेलवरील व्हिडिओ बातम्या आणि Shorts
• जिल्हा → तालुका → गाव अशा क्रमाने स्थानिक बातम्या
• विषयानुसार बातम्या: राजकारण, शेती, शिक्षण, क्रीडा आणि बरेच काही
• बातम्या जतन करा आणि नंतर इंटरनेटशिवाय वाचा
• तुमच्या जिल्ह्यातील महत्त्वाच्या बातम्यांच्या सूचना
• WhatsApp वर बातमी शेअर करा

प्रत्येक बातमी प्रसिद्ध होण्यापूर्वी आमचे संपादक ती तपासतात.
खाते किंवा लॉगिनची गरज नाही.

Swarajya News brings verified Marathi news from your district, taluka and village, with video news from our
official YouTube channel. No account needed.
```

**Category**: News & Magazines · **Tags**: News, Local news · **Contact e-mail**: the newsroom's public e-mail
**Privacy policy URL**: `https://<website-domain>/privacy-policy`

## App content forms

| Form | Answer |
| --- | --- |
| Privacy policy | URL above |
| Ads | **Yes, contains ads** (house banners from local advertisers, labelled «जाहिरात») |
| App access | All functionality available without special access (no login) |
| Content rating | Complete the questionnaire as a **news** app; expect a rating that allows news coverage of violence/crime as reported news |
| Target audience | 18 and over (general news; not designed for children) |
| News app declaration | **Yes, news app.** Provide the publisher name, website, contact details and the editorial-policy URL (`/editorial-policy`) |
| Government app | No |
| Financial features / Health | None |

## Data safety form

The app has no accounts, no analytics SDK and no ad network. Answers:

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | **Yes**: device identifiers for push notifications only |
| Data type | *Device or other IDs* (Firebase Cloud Messaging token) |
| Collected / shared | Collected, **not shared** |
| Processed ephemerally? | No |
| Required or optional? | Optional (users can refuse notification permission) |
| Purpose | App functionality (delivering news notifications) |
| Encrypted in transit | Yes |
| Can users request deletion? | Yes: uninstalling the app deletes the token; requests via the contact page |

Not collected: name, e-mail, phone, location, contacts, photos, browsing history, app activity linked to a person.
Saved stories and notification choices stay on the device. View and ad counts are anonymous totals.

## Release

- **Track**: start with *Internal testing* (newsroom phones), then *Closed testing*, then *Production*.
- New personal developer accounts must run a closed test with at least 12 testers for 14 days before production
  access; an organization account avoids this. Check the current rule in the Play Console when creating the account.
- **Play App Signing**: on (default). Keep the *upload key* (`upload-keystore.jks`) and its passwords in the
  newsroom's password manager; if lost, request an upload-key reset in the Play Console.
- **Version**: bump `version:` in `pubspec.yaml` (`1.0.0+1` → `1.0.1+2`) for every upload; the number after `+`
  must always increase.
