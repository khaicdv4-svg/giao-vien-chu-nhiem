# Eight QR experiences
Approved by user 16 October 2026. Work on feature/qr-experiences; do not deploy.
1. Add fixed hash routes to existing screens; unknown routes stay safe. Verify browser route tests.
2. Add accessible QR previews to matching cards without nested buttons. Verify regeneration after navigation.
3. Generate eight decorated SVG posters with real QR payloads and print gallery. Verify independent decoding.
4. Cache assets and run desktop/mobile smoke tests. No changes to existing classroom data.
Public target: https://giao-vien-chu-nhiem.vercel.app/ . Links become available after publication.

Completed: a9c685a. Verified eight warm routes and eight cold mobile viewport routes, card QR/dialog, independent jsQR decode of eight posters, offline route/gallery after service-worker activation. PDF has eight A4 pages. No physical phone/camera verification. No push or deployment.
