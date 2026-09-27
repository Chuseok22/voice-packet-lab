# Changelog

**현재 버전:** 0.2.0  
**마지막 업데이트:** 2026-09-27T11:56:01Z  

---

## [0.2.0] - 2026-09-27

**✨ 기능**
- add a collapsible sliders panel that stays open on wide screens
- show and let users drag the current viewport on the packet overview

**🐛 수정**
- correct mobile card order, e2e slider access, metrics width, step guide line wrap
- wrap long header values on the connection screen instead of clipping them
- contain the packet lane scroll area so it stops overflowing the page

**♻️ 리팩토링**
- reorder packet lab cards and widen the desktop layout

**🔧 변경사항**
- ignore playwright mcp screenshot scratch folder

---

## [0.1.0] - 2026-09-26

**✨ 기능**
- Voice_Packet_Lab_웹_실습_앱구축 — add voice gateway mock server
- Voice_Packet_Lab_웹_실습_앱구축 — add static file server with security headers
- Voice_Packet_Lab_웹_실습_앱구축 — add shared gateway message types
- Voice_Packet_Lab_웹_실습_앱구축 — add connection screen
- Voice_Packet_Lab_웹_실습_앱구축 — add presenter mode
- Voice_Packet_Lab_웹_실습_앱구축 — add packet lab screen
- Voice_Packet_Lab_웹_실습_앱구축 — add app shell and design tokens
- Voice_Packet_Lab_웹_실습_앱구축 — add korean ui content
- Voice_Packet_Lab_웹_실습_앱구축 — add web audio adapters
- Voice_Packet_Lab_웹_실습_앱구축 — add packet simulation engine

**📝 문서**
- update readme for build-time env and cicd workflow
- add project readme

**♻️ 리팩토링**
- Voice_Packet_Lab_웹_실습_앱구축 — 서버 포트·연결 상한·정적 경로를 환경변수 대신 코드 고정값으로 변경
- Voice_Packet_Lab_웹_실습_앱구축 — 발표자 비밀번호를 평문으로 받아 루트 .env에서 읽도록 변경

**✅ 테스트**
- align e2e config with plain password and fixed port
- add playwright e2e suite
- add server test suite
- add shared gateway type tests
- add connection screen tests
- add presenter mode tests
- add packet lab tests
- add app layout tests
- add content tests
- add audio adapter tests
- add packet simulation engine tests

**🔧 변경사항**
- sync version metadata and readme version section
- add test, docker build and ssh deploy workflow
- update docker and env example for build-time .env
- add docker packaging files
- add connection snapshot capture script
- add sample audio clip generator
- set up pnpm workspace configuration

---

## [0.0.2] - 2026-09-26

**🔧 변경사항**
- initialize repository with project workflows and gitignore

---

