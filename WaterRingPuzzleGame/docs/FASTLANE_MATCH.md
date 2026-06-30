# Fastlane Match — iOS Certificate & Profile Management

This document describes how to use Fastlane Match to manage iOS code-signing
certificates and provisioning profiles for the WaterRingPuzzleGame project.

---

## Prerequisites

- An active **Apple Developer Program** membership (Individual or Organisation).
- **Fastlane** installed (`gem install fastlane` or via Bundler: `bundle install`).
- A **private Git repository** to store encrypted certificates and profiles
  (e.g. `git@github.com:your-org/ios-certificates.git`). Never use a public repo.
- Access to the certificates repository granted to every developer and CI runner
  that needs to sign builds.

---

## Setup

### 1. Initialise Match

From the project root, run:

```sh
bundle exec fastlane match init
```

When prompted:
- **Storage mode**: `git`
- **Git URL**: enter the URL of your private certificates repository
  (e.g. `https://github.com/your-org/ios-certificates.git`)

This creates (or updates) `fastlane/Matchfile` with the storage configuration.

### 2. Generate Certificates and Profiles

Generate certificates for each environment you need:

```sh
# Development (for running on physical devices)
bundle exec fastlane match development

# App Store (for TestFlight and production releases)
bundle exec fastlane match appstore

# Ad Hoc (for internal distribution)
bundle exec fastlane match adhoc
```

Each command will:
1. Create a new certificate + private key (if one does not already exist).
2. Create a provisioning profile linked to the certificate.
3. Encrypt both with the `MATCH_PASSWORD` and push them to the certificates repo.

---

## Certificate Types

| Type          | Used for                                      | Match type argument |
|---------------|-----------------------------------------------|---------------------|
| Development   | Local device builds, Xcode development        | `development`       |
| App Store     | TestFlight, App Store Connect submissions     | `appstore`          |
| Ad Hoc        | Internal beta distribution outside TestFlight | `adhoc`             |

---

## Usage in Lanes

In your `Fastfile`, call `match` before any build step that requires signing:

```ruby
lane :build_release do
  match(type: 'appstore', readonly: true)
  build_app(
    scheme: 'WaterRingPuzzleGame',
    export_method: 'app-store',
  )
end

lane :build_adhoc do
  match(type: 'adhoc', readonly: true)
  build_app(
    scheme: 'WaterRingPuzzleGame',
    export_method: 'ad-hoc',
  )
end
```

Use `readonly: true` in CI to prevent accidental certificate rotation from a
runner that does not have Apple ID credentials.

---

## CI/CD Usage

### Environment Variables

Set the following secrets in your CI provider (GitHub Actions, Bitrise, CircleCI, etc.):

| Variable         | Description                                              |
|------------------|----------------------------------------------------------|
| `MATCH_PASSWORD` | Passphrase used to encrypt/decrypt certificates in the repo |
| `MATCH_GIT_URL`  | URL of the private certificates Git repository           |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64-encoded `user:personal-access-token` for HTTPS auth |

### Example GitHub Actions Step

```yaml
- name: Install certificates
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
  run: bundle exec fastlane match appstore --readonly
```

---

## Troubleshooting

### Certificate Expired

If a certificate has expired, revoke it and regenerate:

```sh
bundle exec fastlane match nuke distribution   # removes appstore cert
bundle exec fastlane match appstore            # creates a fresh one
```

> **Warning**: `nuke` revokes *all* certificates of that type for the team.
> Coordinate with all developers before running this command.

### Readonly Mode Errors

If CI fails with "No certificate found in readonly mode", the certificate may
not exist yet. Run the `match` command once locally (without `readonly: true`)
to generate and push the certificate, then retry CI.

### Git Authentication Failures

Ensure `MATCH_GIT_BASIC_AUTHORIZATION` is correctly base64-encoded:

```sh
echo -n "your-github-username:your-personal-access-token" | base64
```

Paste the output as the secret value (no trailing newline).

### Provisioning Profile Not Found on Device

Run `match` in development mode and re-register the device's UDID with Apple:

```sh
bundle exec fastlane match development --force_for_new_devices
```
