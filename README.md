<h1 align="center">
  <br>
<img width="802" alt="thinkthingTitle" width="300" src="https://github.com/user-attachments/assets/187895b7-9451-40ee-9397-868d262ef192">
</h1>

<h4 align="center">
Easy instrumental performance with yolov10
</h4>
<p align="center">
  <a href="https://github.com/Heejae-L/thinkthing/README.md" target="_blank">
    한국어
  </a>
</p>

<p align="center">
  <a href="#소개">소개</a> •
  <a href="#주요-기능">주요 기능</a> •
  <a href="#프로젝트-구조">프로젝트 구조</a> •
  <a href="#사용-방법">사용 방법</a> •
  <a href="#기술-스택">기술 스택</a> •
  <a href="#추후-목표">추후 목표</a> •
  <a href="#참고-자료">참고 자료</a> •
</p>

<div align="center">

| [<img src="https://github.com/user-attachments/assets/e872ea30-4dc5-4175-8071-76cc76aa1d01" width="100px;"/><br /><sub><b>이희재</b></sub>](https://github.com/Heejae-L) | [<img src="" width="100px;"/><br /><sub><b>이재영</b></sub>](https://github.com/jaeyoung-leee)<br /> |
| :------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------: |
|                                                         백엔드,AI                                                        |                                                          프론트엔드, AI                                                          |

</div>

## 소개

주변의 물체를 이용해 쉽게 악기를 연주하고 음악을 배울 수 있는 오픈소스 프로젝트

- 개발 기간
  - 1차: 2024.07 ~ 2023.08 (6주)

### 1. 개발 배경

- **음악은 중요한 자기 표현 수단이다.**
  음악 연주는 개인의 창의력과 감성 발달에 중요한 역할을 한다. 언제, 어디서나, 어떤 것으로든 음악을 연주할 수 있다면 음악이 일상생활을 더욱 풍요롭게 만들 것이다.
  

- **음악 교육에는 경제적, 환경적 제약이 있다.**
  다른 교육분야와 달리 음악은 악기 구매 비용이나 연주할 공간의 부족으로 악기 연주에 흥미를 가지지 못하는 사람들이 있다. 우리는 이러한 문제를 오픈 소스 인공지능을 통해 해결할 방법을 고민했다.
  


### 2. 개발 목표

- **주변 물체를 이용한 악기 연주**

  카메라 앞의 물체와 사용자의 손을 인식하여 물체를 건드리며 음악을 연주하도록 한다. 이로써 악기를 구매해야한다는 경제적 제약을 극복한다.

- **웹 서비스로 접근성 향상**

  웹 서비스로 개발하여 기기나 위치에 상관없이 이용할 수 있는 서비스를 개발한다. 이러한 점은 음악 연주의 공간적 제약을 극복한다.


### 3. 활용 분야

- **교육**
  - 교육 예산이 부족한 기관에서 카메라만으로 음악 수업을 진행할 수 있다.
  - 인공지능과 컴퓨터 비전 교육을 위한 예시가 될 수 있다.

- **개인**
  - 연주 및 피드백으로 박자와 음에 대한 감각을 익히는 데에 도움을 준다.
  - 주변 물체를 이용하므로 음악에 대한 진입장벽을 낮춘다.

- **기업**
  - yolo와 mediapip를 통해 물체와 사용자간의 거리를 계산하여 소리를 출력하는 기술은 다양한 분야에서 활용이 가능하다.

## 주요 기능

### 1. 물체 악기 연주

<img src="https://github.com/user-attachments/assets/997f12df-4579-4714-abfa-9cfa8a2601b2" alt="연주 화면" width="500">


- 인식 된 물체에 계이름을 할당
  - 처음 서비스를 실행하면 사용자는 화면 속 인식된 물체의 바운딩박스(웹캠 화면 속 빨간색 선)과 물체의 ID(웹캠 화면 속 파란색 글씨)를 확인할 수 있다. 사용자는 이 각각의 물체에 자신이 필요한 계이름을 지정한다. 

- 악보 화면
  - Open sheet music display 라이브러리를 이용해 악보xml을 악보 이미지로 디코딩 한 결과를 출력하는 화면이다. 사용자는 이 악보를 보며 연주를 수행할 수 있다.

- 인식된 물체와 손을 확인할 수 있는 웹캠 화면
  - 사용자는 웹캠 화면을 통해 자신의 손과 물체를 확인하고 연주할 수 있다. 이 화면은 300밀리초 간격으로 서버로 전송되며, 손과 물체 사이의 거리 계산을 통해 사용자가 물체에 손을 대고 있는지 확인한다. 사용자가 물체에 손을 대고 있다고 인식될 경우, 기기에서는 할당된 음계의 소리가 송출된다.

- 각 물체ID에 할당된 계이름을 확인할 수 있는 화면
  - [1]번 단계에서 각 물체에 음계를 할당하면 [5]번 위치에서 리스트로 실시간 확인이 가능하다.


### 2. 연주 기록 및 피드백

<img width="1115" alt="scoreScreen" src="https://github.com/user-attachments/assets/f07d39a8-e597-4f43-9132-e9022f93646f">

- 사용자의 연주를 기록하고 점수를 표시
  - 시작버튼을 누른 후 악보에 맞춰 연주하면 내부적으로 사용자의 연주(음계와 음의 길이)를 기록한다. 종료버튼으로 연주 기록을 중지할 수 있다. 사용자는 점수 확인버튼으로 자신이 악보와 얼마나 비슷하게 연주했는지 확인할 수 있다.
  - 사용자는 피드백을 통해 자신의 연주를 정량적으로 파악하고 박자와 음의 정확성을 향상시킬 수 있다.

## 프로젝트 구조

![structure](https://github.com/user-attachments/assets/9062bf1e-105d-4856-ab9c-042bbdc87da6)

## 사용 방법

### 1. 서버

  1. clone
  ```bash
  git clone https://github.com/Heejae-L/thinkthing.git
  ```

  2. 필요한 패키지 설치

  ```bash
  pip install -r requirements.txt
  ```

  3. 서버 시작

  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

### 2. 클라이언트

- 웹사이트 접속
localhost:8000
- 웹 캠 접근 허용
- 물체 배치
- 계이름 할당
- 시작 버튼
- 연주
- 종료 버튼
- 점수 확인

## 기술 스택

### 프론트엔드

![HTML](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=HTML5&logoColor=black)
![javascript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=JavaScript&logoColor=black)

### 백엔드

![python](https://img.shields.io/badge/python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![uvicorn](https://img.shields.io/badge/uvicorn-4752b1?style=for-the-badge)
![fastapi](https://img.shields.io/badge/fastapi-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![yolo]
![mediapipe]


### 개발

![Git](https://img.shields.io/badge/git-F05032?style=for-the-badge&logo=git&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)

### 협업

![GitHub](https://img.shields.io/badge/github-181717?style=for-the-badge&logo=github&logoColor=white)
![Notion](https://img.shields.io/badge/Notion-FFFFFF.svg?style=for-the-badge&logo=notion&logoColor=black)

## 추후 목표



## 참고 자료
### 오픈소스 출처
- https://github.com/THU-MIG/yolov10
- https://makernambo.com/154
- https://github.com/opensheetmusicdisplay


