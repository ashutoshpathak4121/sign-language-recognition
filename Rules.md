# Rules

**Project:** Sign Language Detection
**Applies to:** everyone who changes this repository, including AI coding assistants.
**Last updated:** 2026-09-20

If a rule here conflicts with a request, raise it before breaking the rule. If a rule needs to change, change this file in the same pull request.

---

## 1. Read first

Before starting work, read in this order:

1. `Memory.md` for current status and decisions
2. `Tasks.md` for what to do next
3. `Architecture.md` if the change touches the server, API, model, or deployment
4. `Design.md` if the change touches the interface

After finishing work, update `Tasks.md` (tick or add tasks) and `Memory.md` (status, decisions, known issues).

## 2. Scope and architecture

- Keep the stack from Architecture.md: Flask, YOLOv5, HTML/CSS/Bootstrap, jQuery/AJAX. Do not add React, Next.js, a database, or a new ML framework without a decision entry in Architecture.md section 12.
- One task per branch and one purpose per pull request.
- Do not build features listed under "Non-goals" in PRD.md.
- No new dependency unless it is needed. Pin its version in `requirements.txt` and say why in the pull request.
- Do not edit files inside `yolov5/` (the cloned upstream code). Only add `best.pt` and read from it. If a change is needed, wrap it in our own code.

## 3. Python (backend)

- Follow PEP 8. Format with `black`, lint with `flake8`, line length 100.
- Existing helper functions keep their names: `decodeImage`, `encodeImageIntoBase64`. All new functions use `snake_case`.
- Type hints on new function signatures. A short docstring on every public function.
- Routes stay thin. Put logic in `signLanguage/` so it can be tested without Flask.
- Never build a shell command from user input. Use `subprocess.run([...], check=True)` with a fixed argument list. Do not use `os.system`.
- Catch expected errors (bad Base64, unreadable image, detection failure) and return the JSON errors defined in Architecture.md section 5. Never return a stack trace to the client.
- Use the `logging` module, not `print`. Never log image data or Base64 strings.
- Never leave `debug=True` in committed code. Read configuration from environment variables with safe defaults.

## 4. API rules

- The contract in Architecture.md section 5 is the source of truth. Change the contract and the document together.
- Changes must be additive. Do not rename or remove existing response fields.
- Validate every request: field present, size within 5 MB, data decodes to a valid JPEG or PNG.
- Error messages say what went wrong and what to do next, in plain language, without internal details.

## 5. Frontend rules

- Plain HTML, CSS, and jQuery. Bootstrap is used for the grid and utilities only. Do not use Bootstrap's default blue buttons or theme. Use the tokens in Design.md.
- All colours, fonts, sizes, and spacing come from CSS variables defined in `static/css/style.css`. No hard-coded hex values elsewhere.
- No inline styles and no inline event handlers. JavaScript lives in `static/js/app.js`.
- Every interactive element works with a keyboard and shows a visible focus ring.
- Every image and control has an accessible name. New results are announced with an `aria-live="polite"` region.
- Respect `prefers-reduced-motion`. No autoplaying motion beyond the single result animation described in Design.md.
- Interface text is plain language, sentence case, active voice. Follow the copy rules in Design.md.
- Live mode: never more than one request in flight, always release the camera on stop and on page hide.
- Test at 360 px, 768 px, and 1280 px widths before merging.

## 6. Model and data rules

- Model weights (`best.pt`) are stored in Git LFS or in a release asset, not in normal Git history if larger than 50 MB.
- Every trained model gets an entry in `Memory.md`: date, dataset and version, epochs, mAP@0.5, and notes on weak letters.
- Do not replace `best.pt` unless the new model scores equal or better on the same test set.
- Check the dataset licence before using it and record it in the README.
- Never commit personal photos or any data with identifiable people unless they gave written consent.
- Keep training, validation, and test images separate. Where possible, keep the same person out of more than one split.
- Do not describe the model as a replacement for interpreters. Keep the "learning tool" wording visible in the interface.

## 7. Security and privacy rules

- No secrets, keys, or tokens in the repository, Docker image, logs, or screenshots. Use GitHub secrets and environment variables.
- Do not store or log user images beyond the current request. `data/` and `yolov5/runs/` stay in `.gitignore`.
- Restrict CORS to the production domain in deployed environments.
- Run the container as a non-root user.
- The privacy note on the page must stay accurate. If behaviour changes, update the note and PRD.md.

## 8. Testing rules

- Use `pytest`. Tests live in `tests/`.
- Every new function in `signLanguage/` has a unit test. Every new route or response field has an API test.
- The API tests must cover: valid image, missing field, invalid Base64, oversized body, and a non-image file.
- Tests must not need a GPU or network. Mock the detection step where needed and keep one slow integration test marked `@pytest.mark.slow`.
- A bug fix starts with a test that fails for that bug.
- Manual test list before a release is in PRD.md section 13.

## 9. Git rules

- Branches: `feature/<short-name>`, `fix/<short-name>`, `docs/<short-name>`, `chore/<short-name>`.
- Commit messages use the imperative and a type prefix: `feat: add live camera mode`, `fix: reject non-image uploads`, `docs: update API contract`.
- Small commits. Do not mix formatting changes with logic changes.
- `main` is always deployable. Merge only through a pull request with passing CI.
- Do not commit: `.env`, `data/`, `yolov5/runs/`, `__pycache__/`, virtual environments, or notebooks with outputs containing personal images.

## 10. Docker and CI/CD rules

- The image must build from a clean checkout with one command.
- Pin the base image version. Do not use `latest`.
- `.dockerignore` excludes `.git`, `data/`, `yolov5/runs/`, `tests/`, and notebooks to keep the image small.
- CI runs on every push: install, lint, tests. Build and deploy jobs run only on `main` and only after CI passes.
- A failed deploy must leave the previous container running. Do not stop the old container until the new image has been pulled.

## 11. Documentation rules

- Update the README when setup, commands, or environment variables change.
- Update Architecture.md when routes, the API, or the deployment change.
- Update Design.md when tokens or components change.
- Write in plain language and short sentences. Prefer examples to long explanations.

## 12. Definition of done

A task is done when all of these are true:

- [ ] It meets the acceptance notes in `Tasks.md`
- [ ] Code is formatted and lint-clean
- [ ] Tests were added or updated and pass
- [ ] It works with keyboard only and at 360 px width (frontend changes)
- [ ] No secrets, debug flags, or stray files are committed
- [ ] Relevant documents are updated
- [ ] `Tasks.md` and `Memory.md` are updated

## 13. Rules for AI assistants

- State assumptions when a request is unclear and choose the simplest option that fits these documents.
- Do not invent files, routes, or dependencies that are not in Architecture.md without saying so and adding them to the documents.
- Do not silently change behaviour outside the task. Mention anything noticed but left alone.
- Never fabricate model accuracy numbers. Report only measured results.
- Show complete files or clear diffs, not fragments with "rest unchanged" where the result cannot be pasted and run.
- When a rule blocks the best solution, explain the trade-off and ask before breaking it.
