'use strict';
/* ============================================================
   군대 뽑기 시뮬레이터 — 콘텐츠 데이터
   (확률·수치는 게임용 값이며 실제 통계와 다를 수 있어요)
   ============================================================ */

const STAT_KEYS = ['body', 'mind', 'rep', 'bond', 'skill'];
const STAT_NAME = { body: '체력', mind: '멘탈', rep: '군기', bond: '관계', skill: '성장', money: '통장', leave: '휴가', gf: '곰신' };

const GRADE = {
  '-2': { n: '지옥', c: '#b3261e' },
  '-1': { n: '고생', c: '#d9731e' },
  '0': { n: '무난', c: '#6b7280' },
  '1': { n: '꿀', c: '#2f8f5b' },
  '2': { n: '대박', c: '#c9941a' },
};
function gradeOf(g) { return GRADE[String(Math.max(-2, Math.min(2, Math.round(g))))]; }

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const GIVEN = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지후', '준우', '현우', '도현', '건우', '우진', '선우', '민재', '은우', '재윤', '태양', '승현', '동현', '지훈', '정우', '성민'];

/* ---------- 신체등급 (병역판정검사) ---------- */
const FIT = [
  { g: 1, name: '1급', kind: 'active', w: 20, label: '현역 입영 대상', desc: '몸 상태 최상급. 어디로 가도 굴릴 수 있다는 평가.', body: 8 },
  { g: 2, name: '2급', kind: 'active', w: 33, label: '현역 입영 대상', desc: '건강한 평균 이상. 가장 흔한 판정입니다.', body: 3 },
  { g: 3, name: '3급', kind: 'active', w: 32, label: '현역 입영 대상', desc: '현역 판정. 어딘가 조금 불편하지만 충분히 갑니다.', body: 0 },
  { g: 4, name: '4급', kind: 'civil', w: 10, label: '사회복무요원 대상', desc: '보충역 판정. 출퇴근하며 복무하는 사회복무요원으로 갑니다.', body: 0 },
  { g: 5, name: '5급', kind: 'exempt5', w: 1.5, label: '전시근로역', desc: '평시 병역 의무 이행 대상이 아닙니다.' },
  { g: 6, name: '6급', kind: 'exempt', w: 1.2, label: '병역 면제', desc: '병역 면제 판정. 이 이야기는 여기서 끝납니다.' },
  { g: 7, name: '7급', kind: 'retest', w: 2.3, label: '재신체검사', desc: '결과 보류. 다음에 다시 검사받습니다.' },
];

/* ---------- 군종 ---------- */
const BRANCH = {
  army:   { id: 'army',   name: '육군',         months: 18, train: 5, trainName: '육군훈련소',                 w: 70,  g: 0,  scene: 'camp',   uni: 'army',   tag: '가장 흔한 길. 그래서 가장 다양한 운이 기다립니다.', blurb: '대한민국 현역의 대부분. 보직 뽑기가 인생을 가릅니다.' },
  navy:   { id: 'navy',   name: '해군',         months: 20, train: 5, trainName: '해군 신병교육대',            w: 7,   g: 0,  scene: 'ship',   uni: 'navy',   tag: '20개월. 파도 위에서 멀미가 곧 실력.', blurb: '복무기간이 육군보다 2개월 깁니다. 함정이냐 육상이냐가 난이도를 가릅니다.' },
  af:     { id: 'af',     name: '공군',         months: 21, train: 5, trainName: '공군 기본군사훈련단',        w: 8,   g: 1,  scene: 'runway', uni: 'af',     tag: '21개월. 대신 생활 여건이 좋다는 소문.', blurb: '복무기간 최장급이지만 출퇴근 같은 일과제에 6주마다 정기외박. 생활 여건은 평이 좋습니다.' },
  marine: { id: 'marine', name: '해병대',       months: 18, train: 6, trainName: '해병대 신병교육대',          w: 5,   g: -1, scene: 'beach',  uni: 'marine', tag: '"해병은 안 한다고 해도 한다." 빨간 명찰의 길.', blurb: '훈련 6주의 끝에 극기주 행군과 빨간 명찰 수여식이 있습니다. 끝나면 자부심이 남습니다.' },
  katusa: { id: 'katusa', name: '카투사',       months: 18, train: 8, trainName: '육군훈련소 + 카투사교육대',  w: 1.5, g: 2,  scene: 'katusa', uni: 'army',   tag: '어학성적 통과자 중 전산 추첨, 경쟁률 약 10:1. 지원은 평생 1회.', blurb: '훈련소 뒤 카투사교육대에서 영어와 미군 전투기술을 배운 다음, 미군 부대로 배속됩니다.' },
  sangun: { id: 'sangun', name: '상근예비역',   months: 18, train: 5, trainName: '육군훈련소',                 w: 8.5, g: 1,  scene: 'town',   uni: 'army',   tag: '집에서 출퇴근하는 현역. 단, 새벽 비상소집은 덤.', blurb: '훈련소를 마치면 출퇴근하며 복무하는 예비군 지원 보직입니다.' },
  civil:  { id: 'civil',  name: '사회복무요원', months: 21, train: 3, trainName: '사회복무연수센터',           w: 0,   g: 0,  scene: 'town',   uni: 'civil',  tag: '21개월. 군복 대신 사복 근무, 출퇴근하는 복무.', blurb: '4급 판정자의 길. 근무지를 직접 고르거나 결원에 자동 배치되어 21개월, 보통 9시~18시로 복무합니다.' },
};
const BRANCH_ROLL = ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'];
/* 정기휴가(연가) 총일수. 육군·해병 24, 해군 27, 공군 28 (나무위키 기준). 카투사·상근·사회복무는 육군과 같다고 가정한 게임용 값 */
const LEAVE_TOTAL = { army: 24, navy: 27, af: 28, marine: 24, katusa: 24, sangun: 24, civil: 24 };
const RANK_NAMES = ['이병', '일병', '상병', '병장'];
const CIVIL_PHASE = ['신규', '적응기', '중견', '말년'];
const PAY = [75, 90, 120, 150]; // 이병·일병·상병·병장 월 봉급(만원). 2026년 보도 기준, 장병내일준비적금 정부 매칭(월 최대 55만원)은 별도

/* ---------- 입대 전 배경 ---------- */
const MAJORS = [
  { id: 'eng',   name: '컴퓨터·전기전자 공학', w: 16, boost: { comm: 3, office: 1.5 }, mod: { skill: 6 }, blurb: '휴학 직전까지 밤새 코딩하던 공대생' },
  { id: 'hum',   name: '인문·사회 계열',       w: 16, boost: { office: 2 }, mod: { bond: 4 }, blurb: '글과 말에는 자신 있는 문과생' },
  { id: 'biz',   name: '경영·경제 계열',       w: 12, boost: { office: 2, supply: 1.5 }, mod: { skill: 3 }, money: 10, blurb: '엑셀이라면 자신 있는 상경계 학생' },
  { id: 'music', name: '음악 전공',            w: 3,  boost: { band: 14 }, mod: { mind: 3 }, blurb: '악기 가방을 메고 입대한 음대생' },
  { id: 'sport', name: '체육 전공',            w: 5,  boost: { special: 3, combat: 1.5 }, mod: { body: 12 }, blurb: '몸이 먼저 반응하는 체대생' },
  { id: 'med',   name: '보건·간호 계열',       w: 6,  boost: { medic: 8 }, mod: { skill: 3 }, blurb: '의료 지식이 조금 있는 보건계열' },
  { id: 'cook',  name: '조리·제과 전공',       w: 4,  boost: { cook: 8 }, mod: {}, blurb: '칼 잡는 손이 야무진 조리 전공' },
  { id: 'drive', name: '운전 경력(배달 알바)', w: 7,  boost: { driver: 8 }, mod: {}, blurb: '골목길을 훤히 아는 운전 경력자' },
  { id: 'job',   name: '휴학 후 직장·알바',    w: 10, boost: {}, mod: { rep: 4, mind: -2 }, money: 30, blurb: '사회생활을 먼저 해 본 눈치 만렙' },
  { id: 'none',  name: '평범한 대학생',        w: 21, boost: {}, mod: {}, blurb: '특별할 것 없는, 그래서 가장 평범한 대학생' },
];

/* ---------- 자대/보직 ----------
   w: 가중치, g: 꿀지수(-2~+2), phys: 체력 변화, skill: 성장 속도 */
const UNITS = [
  /* 육군 */
  { id: 'a_inf',    br: 'army', name: '보병 일반 소대',        place: '전방 지역 보병사단',        w: 28,  g: 0,  phys: .5,  skill: 0,   scene: 'camp',   tags: ['combat'],                 blurb: '군대 하면 떠오르는 바로 그 모습. 구보와 경계와 청소의 삼각형.' },
  { id: 'a_gop',    br: 'army', name: 'GOP 철책 경계',         place: '강원도 최전방 철책',         w: 8,   g: -1, phys: .8,  skill: -.05, scene: 'gop',   tags: ['combat', 'gop'],          leaveBonus: 1, blurb: '새벽 별은 쏟아지지만 근무가 훈련보다 길다. 근무·작업의 반복이지만 보상휴가가 붙습니다.' },
  { id: 'a_recon',  br: 'army', name: '수색대대',              place: '최전방 수색대대',            w: 3,   g: -2, phys: 1.2, skill: -.05, scene: 'gop',   tags: ['combat', 'special'],      leaveBonus: .4, blurb: '지원자 위주로 모이는 팀. 몸은 고되지만 분위기는 의외로 편하다는 평도 있습니다.' },
  { id: 'a_arty',   br: 'army', name: '포병 포반',             place: '야전 포병여단',              w: 7,   g: -1, phys: .8,  skill: 0,   scene: 'camp',   tags: ['combat', 'arty'],          blurb: '보병보다 무거운 군장을 메고 더 걷는다는 말이 도는 곳. 자주포 안에서 기다리는 시간도 깁니다.' },
  { id: 'a_armor',  br: 'army', name: '기갑·전차',             place: '기갑여단',                   w: 4,   g: 0,  phys: .4,  skill: .05, scene: 'camp',   tags: ['combat', 'motor', 'armor'], blurb: '전차는 멋있다. 정비 시간은 더 길고, 무거운 장비 탓에 관절이 먼저 닳습니다.' },
  { id: 'a_eng',    br: 'army', name: '공병',                  place: '공병대대',                   w: 4,   g: -1, phys: .9,  skill: .05, scene: 'camp',   tags: ['combat', 'work', 'eng'],   blurb: '삽질과 도로 공사의 달인이 되어 돌아옵니다. 운전병도 이곳이 가장 고생이란 얘기가 있어요.' },
  { id: 'a_signal', br: 'army', name: '통신병',                place: '통신대대',                   w: 6,   g: 0,  phys: .1,  skill: .25, scene: 'office', tags: ['comm'],                   blurb: '선을 잇고 망을 지킵니다. 전역 후 쓸 만한 기술은 덤.' },
  { id: 'a_driver', br: 'army', name: '운전병',                place: '수송부',                     w: 5,   g: 0,  phys: .2,  skill: .1,  scene: 'camp',   tags: ['driver'],                 blurb: '핸들만 잡으면 되는 줄 알았다. 세차·정비·선탑 간부 눈치까지 포함이고, 운행이 적으면 작업병이 됩니다.' },
  { id: 'a_admin',  br: 'army', name: '행정병',                place: '대대 본부 행정반',           w: 6,   g: 1,  phys: 0,   skill: .25, scene: 'office', tags: ['office'],                 blurb: '공문과 휴가 서류의 세계. 실내라 편해 보이지만 검열 철엔 야근, 전투병의 편견은 덤입니다.' },
  { id: 'a_cook',   br: 'army', name: '취사병',                place: '취사장',                     w: 4,   g: -1, phys: .4,  skill: .05, scene: 'camp',   tags: ['cook'],                   blurb: '새벽 4~5시 기상에 주말도 없습니다. 대신 불침번 열외, 위로휴가는 분기마다.' },
  { id: 'a_medic',  br: 'army', name: '의무병',                place: '대대 의무대',                w: 3,   g: 0,  phys: .1,  skill: .2,  scene: 'camp',   tags: ['medic'],                  blurb: '진료 줄 세우기부터 응급처치까지. 의무학교 교육을 받고 오지만 인력 부족에 작업 차출도 잦습니다.' },
  { id: 'a_mp',     br: 'army', name: '군사경찰',              place: '군사경찰대',                 w: 3,   g: 0,  phys: .5,  skill: .05, scene: 'camp',   tags: ['mp'],                     blurb: '완장 두르고 부대를 지킵니다. 눈빛은 날카롭게.' },
  { id: 'a_hq',     br: 'army', name: '사단 사령부 근무지원',  place: '사단 사령부',                w: 5,   g: 1,  phys: .1,  skill: .15, scene: 'office', tags: ['office'],                 blurb: '높은 분들과 가까운 대신 일과도 가깝습니다. 살림은 편한 편.' },
  { id: 'a_rear',   br: 'army', name: '후방 동원 부대',        place: '지방 동원지원단',            w: 4,   g: 1,  phys: .2,  skill: .1,  scene: 'camp',   tags: ['rear'],                   blurb: '조용한 후방 부대. 예비군 철이 아니면 한적합니다.' },
  { id: 'a_band',   br: 'army', name: '군악대',                place: '국군 군악대',                w: .8,  g: 2,  phys: .1,  skill: .3,  scene: 'office', tags: ['band'],                   blurb: '실기 오디션을 통과해야 갈 수 있는 자리. 연습과 행사가 일과이고, 겨울엔 악기가 얼어붙습니다.' },
  { id: 'a_mnd',    br: 'army', name: '국방부 근무지원단',     place: '서울 국방부',                w: 1,   g: 2,  phys: 0,   skill: .35, scene: 'office', tags: ['office', 'seoul'],        blurb: '서울 한복판에서 출퇴근 같은 군 생활. 전설의 SSR 보직.' },
  { id: 'a_trainer',br: 'army', name: '훈련소 조교',           place: '육군훈련소',                 w: 2,   g: -1, phys: .8,  skill: 0,   scene: 'camp',   tags: ['trainer'],                blurb: '이제는 훈련병을 맞이하는 쪽. 겉보기보다 감정노동이 큰 보직입니다.' },
  { id: 'a_supply', br: 'army', name: '병기·보급',             place: '보급대대',                   w: 4,   g: 0,  phys: .3,  skill: .1,  scene: 'camp',   tags: ['supply'],                 blurb: '창고 정리와 재고 관리의 세계. 나름 평화롭습니다.' },
  { id: 'a_it',     br: 'army', name: '정훈·전산',             place: '정훈공보·전산반',            w: 2,   g: 1,  phys: 0,   skill: .3,  scene: 'office', tags: ['comm', 'office'],         blurb: '컴퓨터 앞에서 일하는 이른바 꿀 특기.' },
  /* 해군 */
  { id: 'n_ship',   br: 'navy', name: '함정 승조원',           place: '해군 호위함',                w: 12,  g: -1, phys: .6,  skill: .05, scene: 'ship',   tags: ['sea', 'ship'],            blurb: '며칠씩 바다 위에서 보내는 삶. 갑판 위 일출은 보너스.' },
  { id: 'n_base',   br: 'navy', name: '해군기지 경비',         place: '해군기지',                   w: 9,   g: 0,  phys: .4,  skill: 0,   scene: 'ship',   tags: ['sea', 'base'],            blurb: '육지에서 바다를 지킵니다. 멀미는 안 해도 되는 쪽.' },
  { id: 'n_hq',     br: 'navy', name: '해군본부 행정',         place: '계룡대 해군본부',            w: 5,   g: 1,  phys: 0,   skill: .25, scene: 'office', tags: ['office'],                 blurb: '충남 계룡대에서 서류와 함께하는 비교적 평온한 복무.' },
  { id: 'n_air',    br: 'navy', name: '해상초계기 정비',       place: '해군 항공단',                w: 3,   g: 1,  phys: .2,  skill: .25, scene: 'runway', tags: ['air', 'work'],            blurb: '날개 달린 초계기를 만지는 기술 보직.' },
  { id: 'n_galley', br: 'navy', name: '함정 조리병',           place: '해군 함정 조리실',           w: 3,   g: -1, phys: .3,  skill: .05, scene: 'ship',   tags: ['cook', 'sea'],            blurb: '흔들리는 배 위에서 백 명 분의 식사를 책임집니다.' },
  /* 공군 */
  { id: 'f_base',   br: 'af',   name: '기지 방호',             place: '공군 비행단 외곽',           w: 12,  g: -1, phys: .6,  skill: 0,   scene: 'runway', tags: ['air', 'base'],            blurb: '활주로를 지키는 경계 근무. 밤에는 비행기 소리가 자장가.' },
  { id: 'f_ops',    br: 'af',   name: '비행단 근무지원(행정)', place: '공군 비행단 본부',           w: 10,  g: 1,  phys: 0,   skill: .2,  scene: 'office', tags: ['office', 'air'],          blurb: '에어컨 나오는 사무실에서의 군 생활. 소문대로입니다.' },
  { id: 'f_maint',  br: 'af',   name: '항공기 정비',           place: '정비창',                     w: 8,   g: 0,  phys: .3,  skill: .25, scene: 'runway', tags: ['air', 'work'],            blurb: '전투기의 심장을 만지는 기술병. 전역 후 스펙으로 쓸 만합니다.' },
  { id: 'f_comm',   br: 'af',   name: '전산·통신',             place: '통신전자대',                 w: 6,   g: 1,  phys: 0,   skill: .3,  scene: 'office', tags: ['comm'],                   blurb: '서버실이 일터. 시원하고 조용합니다.' },
  { id: 'f_wx',     br: 'af',   name: '기상',                  place: '기상대',                     w: 2,   g: 1,  phys: 0,   skill: .25, scene: 'office', tags: ['office'],                 blurb: '구름을 읽는 일. 일기예보는 정확해졌고 눈치는 빨라졌습니다.' },
  { id: 'f_fire',   br: 'af',   name: '소방',                  place: '기지 소방대',                w: 3,   g: 0,  phys: .6,  skill: .1,  scene: 'runway', tags: ['air', 'special', 'fire'], blurb: '출동 사이렌이 울릴 때까지는 한가롭습니다.' },
  { id: 'f_honor',  br: 'af',   name: '의장대',                place: '공군 의장대',                w: 1.5, g: -1, phys: .8,  skill: 0,   scene: 'runway', tags: ['ceremonial', 'special'],  blurb: '각 잡힌 제식과 행사 연습의 반복. 어깨가 단단해집니다.' },
  /* 해병대 */
  { id: 'm_assault',br: 'marine', name: '상륙돌격 보병',       place: '해병 사단',                  w: 25,  g: -1, phys: 1,   skill: -.05, scene: 'beach', tags: ['combat', 'sea'],          blurb: '파도 속에서 몸을 던지는 해병 보병. 체력은 확실히 보장.' },
  { id: 'm_island', br: 'marine', name: '서북도서 방어',       place: '서해 5도(섬 근무)',          w: 18,  g: -2, phys: .9,  skill: -.05, scene: 'beach', tags: ['combat', 'island'],       leaveBonus: .5, blurb: '배 타고 들어가는 섬. 외출이 쉽지 않지만 일몰은 일품.' },
  { id: 'm_recon',  br: 'marine', name: '수색대대',            place: '해병 수색대대',              w: 6,   g: -2, phys: 1.3, skill: -.05, scene: 'beach', tags: ['combat', 'special'],      blurb: '가장 단단한 사람들이 모이는 곳. 근성이 남습니다.' },
  { id: 'm_arty',   br: 'marine', name: '포병',                place: '해병 포병여단',              w: 12,  g: -1, phys: .8,  skill: 0,   scene: 'beach',  tags: ['combat', 'arty'],          blurb: '포탄 운반은 해병식. 팔 힘 하나는 확실합니다.' },
  { id: 'm_hq',     br: 'marine', name: '해병 부대 행정',      place: '해병대 사령부 예하 본부',    w: 8,   g: 1,  phys: .1,  skill: .2,  scene: 'office', tags: ['office'],                 blurb: '해병대에도 행정은 있습니다. 해병식으로 각 잡힌 사무실.' },
  { id: 'm_band',   br: 'marine', name: '군악·의장대',         place: '해병 군악의장대',            w: 3,   g: 1,  phys: .3,  skill: .2,  scene: 'office', tags: ['band', 'ceremonial'],     blurb: '화려한 무대 뒤엔 잠긴 목과 발 아픈 제식 연습이 있습니다.' },
  { id: 'm_cook',   br: 'marine', name: '취사',                place: '해병 취사장',                w: 5,   g: 0,  phys: .3,  skill: .05, scene: 'beach',  tags: ['cook'],                   blurb: '배고픈 해병들의 에너지를 책임지는 요리사.' },
  { id: 'm_sig',    br: 'marine', name: '통신',                place: '해병 통신대',                w: 8,   g: 0,  phys: .2,  skill: .2,  scene: 'office', tags: ['comm'],                   blurb: '무전기와 통신망을 책임지는 든든한 연결 고리.' },
  /* 카투사 */
  { id: 'k_hump',   br: 'katusa', name: '캠프 험프리스(평택)', place: '평택 미군기지',              w: 50,  g: 2,  phys: .1,  skill: .4,  scene: 'katusa', tags: ['us'],                     blurb: '넓고 깨끗한 기지. 영어가 일상이고 햄버거도 푸짐합니다.' },
  { id: 'k_casey',  br: 'katusa', name: '캠프 케이시·동두천',  place: '경기 북부 미군기지',         w: 25,  g: 1,  phys: .3,  skill: .3,  scene: 'katusa', tags: ['us'],                     blurb: '기지 안은 이국적, 밖은 한국. 묘하게 매력적인 근무지.' },
  { id: 'k_cfc',    br: 'katusa', name: '한미연합사',          place: '평택 연합군사령부',          w: 10,  g: 2,  phys: 0,   skill: .5,  scene: 'katusa', tags: ['us', 'office'],           blurb: '장교급 미군과 함께하는 엘리트 사무직.' },
  { id: 'k_dmz',    br: 'katusa', name: '미군 전방 전술부대',  place: '경기 북부 전술부대',         w: 15,  g: 0,  phys: .5,  skill: .25, scene: 'katusa', tags: ['us', 'combat'],           blurb: '기지 밖 훈련도 많은 현장형 카투사.' },
  /* 상근예비역 */
  { id: 's_dong',   br: 'sangun', name: '예비군 동대 행정',    place: '지역 예비군 동대',           w: 60,  g: 1,  phys: 0,   skill: .15, scene: 'town',   tags: ['rear', 'office', 'commute'], blurb: '집에서 출근, 퇴근. 예비군 서류를 다룹니다.' },
  { id: 's_drill',  br: 'sangun', name: '예비군 훈련장 조교',  place: '예비군 훈련장',              w: 25,  g: 0,  phys: .4,  skill: .05, scene: 'town',   tags: ['rear', 'commute'],        blurb: '예비군들의 불평을 온몸으로 받아내는 자리.' },
  { id: 's_night',  br: 'sangun', name: '향방작전 야간 근무',  place: '지역 상황실',                w: 15,  g: 0,  phys: .1,  skill: .05, scene: 'town',   tags: ['rear', 'commute'],        blurb: '밤샘 근무가 잦은 상황실. 비상소집의 주인공.' },
  /* 사회복무 */
  { id: 'c_dong',   br: 'civil',  name: '주민센터',            place: '동 주민센터',                w: 28,  g: 0,  phys: 0,   skill: .12, scene: 'town',   tags: ['civil', 'office', 'commute'], blurb: '민원 안내에 선거 우편물 포장, 제설까지. 잡무가 많은 동네 최전선이지만 동에 따라 한가한 곳도 있습니다.' },
  { id: 'c_gu',     br: 'civil',  name: '구청(본청)',          place: '구청',                       w: 18,  g: 1,  phys: .1,  skill: .15, scene: 'town',   tags: ['civil', 'office', 'commute', 'gu'], blurb: '부서 운이 전부입니다. 행정·민원 부서는 비교적 편하다는 평이 많습니다.' },
  { id: 'c_lib',    br: 'civil',  name: '구립 도서관',         place: '구립 도서관',                w: 12,  g: 1,  phys: 0,   skill: .4,  scene: 'town',   tags: ['civil', 'office', 'commute', 'lib'], blurb: '책 정리와 대출 업무. 어린이실을 맡으면 얘기가 달라지지만, 공부할 틈은 꽤 납니다.' },
  { id: 'c_school', br: 'civil',  name: '학교 행정 도우미',    place: '초·중학교 행정실',           w: 14,  g: 0,  phys: .1,  skill: .15, scene: 'town',   tags: ['civil', 'commute'],       blurb: '학교에 따라 편차가 큽니다. 방학이면 거의 할 일이 없는 곳도 있어요.' },
  { id: 'c_welfare',br: 'civil',  name: '노인복지관',          place: '노인복지관',                 w: 14,  g: -1, phys: .3,  skill: .05, scene: 'town',   tags: ['civil', 'care', 'commute'], blurb: '어르신 돌봄 현장. 힘들지만 마음은 따뜻해집니다. 이용자와 직접 마주하면 학대 신고 의무자가 되기도 해요.' },
  { id: 'c_hosp',   br: 'civil',  name: '요양·복지시설',       place: '요양병원',                   w: 8,   g: -1, phys: .4,  skill: .05, scene: 'town',   tags: ['civil', 'care', 'commute'], blurb: '돌봄이 필요한 분들 곁에서 일합니다. 체력과 인내가 필요해요.' },
  { id: 'c_station',br: 'civil',  name: '지하철·철도 역사',    place: '지하철 역사',                w: 7,   g: -1, phys: .2,  skill: .05, scene: 'town',   tags: ['civil', 'station', 'commute'], blurb: '승객 안내와 역사 순찰. 교대와 토요일 근무가 끼는 곳이 많습니다.' },
  { id: 'c_fire',   br: 'civil',  name: '소방서(119안전센터)', place: '소방서',                     w: 8,   g: 0,  phys: .4,  skill: .1,  scene: 'town',   tags: ['civil', 'commute', 'fire119'], blurb: '내근과 외근이 갈립니다. 주간·야간 교대로 돌아가는 곳도 있어요.' },
  { id: 'c_park',   br: 'civil',  name: '공원·시설관리',       place: '시설관리공단',               w: 9,   g: -1, phys: .5,  skill: .05, scene: 'town',   tags: ['civil', 'outdoor', 'commute'], blurb: '공원 관리, 청소, 제설… 외근이 많은 야외 보직.' },
];

/* ---------- 부대 분위기 ---------- */
const CULTURES = [
  { id: 'family',   name: '가족 같은 분위기',      w: 15, g: 1,  desc: '선임도 후임도 서로 챙겨 주는 따뜻한 부대',     drift: { bond: .12, mind: .08 } },
  { id: 'normal',   name: '평범한 분위기',         w: 40, g: 0,  desc: '특별히 좋지도 나쁘지도 않은 보통의 부대',       drift: {} },
  { id: 'strict',   name: '군기가 센 부대',        w: 12, g: -1, desc: '각 잡힌 생활. 규칙은 철저하고 여유는 적다',     drift: { rep: .1, mind: -.12 } },
  { id: 'busy',     name: '일이 끊이지 않는 부대', w: 12, g: -1, desc: '훈련·작업·행사가 연달아 이어지는 바쁜 부대',     drift: { body: -.1, mind: -.06 } },
  { id: 'generous', name: '휴가·외출이 후한 부대', w: 10, g: 1,  desc: '포상휴가가 시원시원하게 나오는 인심 좋은 부대', drift: { mind: .06 }, leaveRate: .5 },
  { id: 'free',     name: '자유로운 분위기',       w: 11, g: 1,  desc: '눈치 보는 일이 적은 자율적인 부대',             drift: { mind: .1, rep: -.04 } },
];

/* ---------- 간부·선임 운 ---------- */
const BOSSES = [
  { id: 'angel',  name: '천사 같은 소대장님', w: 8,  g: 2,  desc: '병사들의 사정을 먼저 들어 주는 간부',               drift: { mind: .12, bond: .06 } },
  { id: 'fair',   name: '공정한 원칙주의 간부', w: 25, g: 0,  desc: '칭찬도 꾸중도 정확한 기준대로 주는 간부',           drift: { rep: .06 } },
  { id: 'hot',    name: '열정 과다 간부',     w: 15, g: -1, desc: '의욕이 넘쳐서 일을 계속 만들어 오는 간부',           drift: { body: -.08, skill: .1, mind: -.06, rep: .05 } },
  { id: 'ghost',  name: '존재감 없는 간부',   w: 20, g: 0,  desc: '있는 듯 없는 듯 잘 보이지 않는 간부',               drift: { mind: .05, rep: -.04 } },
  { id: 'tsun',   name: '츤데레 분대장',      w: 17, g: 1,  desc: '투덜대면서도 끝까지 챙겨 주는 맞선임',              drift: { bond: .08, rep: .04, mind: .04 } },
  { id: 'alum',   name: '알고 보니 대학 선배', w: 3,  g: 2,  desc: '같은 학교 출신 간부. 은근히 이것저것 챙겨 줌',     drift: { rep: .1, bond: .1, mind: .1 } },
  { id: 'sharp',  name: '말이 날카로운 간부', w: 9,  g: -2, desc: '한마디 한마디가 뼈를 때리는 간부(폭력은 없어요)',   drift: { mind: -.15, rep: .04 } },
];

/* ---------- 훈련소 이벤트 ---------- */
const TRAIN_EVENTS = [
  { id: 't_enlist', order: 0, title: s => s.branch === 'civil' ? '소집 첫날' : '입영식', scene: 'camp',
    text: s => s.branch === 'civil'
      ? '연수센터 정문 앞. 사복 차림의 사람들이 어색하게 서 있다. 오늘부터 21개월의 복무가 시작된다.'
      : '입영 첫날. 연병장에 줄을 서고 가족과 마지막 인사를 나눈다. 곧 "집합!" 구령과 함께 모두가 낯선 일과 속으로 들어간다.',
    choices: [
      { t: '씩씩하게 인사한다', fx: { rep: 4, mind: -2 }, text: '목소리가 생각보다 크게 나왔다. 옆에서 지켜보던 조교가 슬쩍 고개를 끄덕인다.' },
      { t: '울컥해서 눈물을 훔친다', fx: { mind: -4, bond: 4 }, text: '옆에서 같이 울먹이던 동기와 눈이 마주쳤다. 의외로 첫 친구가 생겼다.' },
      { t: '여자친구와 오래 껴안는다', need: s => s.gf, fx: { mind: -3, gf: 8 }, text: '"기다릴게." 그 한마디가 훈련소 내내 머릿속에서 재생된다.' },
    ] },
  { id: 't_haircut', order: 1, auto: true, hl: false, title: '머리 정리와 보급', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '머리를 짧게 정리하고 군복·군화·세면도구를 받는다. 모두가 같은 옷, 같은 얼굴이 되어 낯설게 서로를 쳐다본다.',
    fx: { mind: -2, bond: 3 }, result: '"야, 너 머리 모양이 의외로 괜찮다." 처음으로 다 같이 웃었다.' },
  { id: 't_civil_edu', order: 1, auto: true, title: '기본 소양 교육', scene: 'town', br: ['civil'],
    text: '직업윤리, 개인정보 보호, 근무 요령 강의가 이어진다. 퀴즈에서 만점을 받은 사람이 의외로 눈에 띈다.',
    fx: { skill: 3, rep: 2 }, result: '필기도구를 챙겨 온 보람이 있었다. 강사님이 이름을 기억해 준다.' },
  { id: 't_letter', order: 1.6, auto: true, title: '편지가 도착한 저녁', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '저녁 시간, 조교가 이름을 호명한다. 가족과 친구가 보낸 편지가 도착했다. 훈련병들은 짧은 편지 한 장을 몇 번이고 되풀이해 읽는다.',
    fx: { mind: 5, gf: 5 }, result: '"밥은 잘 먹고 있니?" 평범한 문장에 눈시울이 뜨거워졌다.' },
  { id: 't_range', order: 2, title: '영점사격', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '소총 조작을 익힌 뒤 처음으로 사로에 선다. 영점을 잡는 날이다. 숨을 고르고 조준경 너머 표적에 집중한다.',
    choices: [
      { t: '호흡을 가다듬고 집중한다', p: s => .3 + s.stats.mind / 250 + (s.major === 'sport' ? .1 : 0),
        win: { fx: { rep: 8, mind: 3 }, text: '탄착군이 한 곳에 모였다! 조교가 "특등사수 후보감"이라며 엄지를 올린다.', hl: '훈련소 사격에서 특등사수급 성적을 냄' },
        lose: { fx: { rep: 1 }, text: '긴장한 탓에 반은 표적 밖. 그래도 다음 주면 나아질 것이다.' } },
      { t: '무난하게 쏜다', fx: { rep: 1 }, text: '합격선만 넘기는 평범한 성적. 부담 없이 끝냈다.' },
    ] },
  { id: 't_phone', order: 2.7, title: '주말 한 시간, 휴대전화 시간', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '훈련병은 주말에만 휴대전화를 한 시간씩 쓸 수 있다. 평소엔 보관함에 잠들어 있던 화면이 켜지고, 알림이 한꺼번에 쏟아진다.',
    choices: [
      { t: '부모님께 전화한다', fx: { mind: 6 }, text: '"밥은 잘 먹고 있니?" 한 시간이 순식간이다. 끊고 나서도 목소리가 귓가에 남는다.' },
      { t: '곰신과 통화한다', need: s => s.gf, fx: { gf: 8, mind: 5 }, text: '짧은 통화, 긴 여운. 다음 주말까지 기다릴 힘이 생겼다.' },
      { t: '뉴스와 SNS를 훑어본다', fx: { mind: 3 }, text: '세상은 그대로 잘 돌아가고 있었다. 이상하게 허전하면서도 안심이 된다.' },
    ] },
  { id: 't_gas', order: 3, title: '화생방 방호교육(가스 실습)', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '방독면을 쓰고 가스실에 들어가, 정화통을 확인한 뒤 방독면을 벗고 구호를 외쳐야 하는 시간. 문이 열린다.',
    choices: [
      { t: '끝까지 버틴다', fx: { mind: -5, rep: 5 }, text: '눈물 콧물이 범벅이 됐지만 끝까지 외쳤다. 훈련소 최대 난관 통과!', hl: '훈련소 화생방 가스 실습을 끝까지 버텨 냄' },
      { t: '눈물 콧물 쏟으며 탈출한다', fx: { mind: -2, bond: 3 }, text: '문 밖에서 동기들과 서로의 얼굴을 보며 한참 웃었다.' },
    ] },
  { id: 't_grenade', order: 3.2, title: '수류탄 투척', scene: 'camp', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '3주차, 수류탄 교육. 투척호 안에는 조교와 나, 둘뿐이다. 안전핀을 뽑으라는 구령이 떨어진다.',
    choices: [
      { t: '교육받은 순서를 속으로 외우며 던진다', p: s => .7 + s.stats.mind / 500,
        win: { fx: { rep: 5, mind: 2 }, text: '"투척!" 구령에 맞춰 던지고 엄폐. 쾅 소리와 함께 긴장이 풀렸다. 조교가 "깔끔하다"고 한다.' },
        lose: { fx: { mind: -2 }, text: '긴장으로 구령을 한 박자 놓쳤다. 조교가 침착하게 다시 짚어 줘 무사히 마쳤다.' } },
      { t: '구령을 몇 번이고 되묻는다', fx: { rep: 1, mind: -1 }, text: '"한 번 더 말씀해 주십시오!" 조교는 조금도 짜증내지 않고 천천히 확인해 줬다. 안전이 최우선이다.' },
    ] },
  { id: 't_night', order: 3.5, title: '첫 불침번', scene: 'night', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '새벽 2시. 소등된 생활관에서 홀로 깨어 있다. 눈꺼풀이 천근만근이다.',
    choices: [
      { t: '허벅지를 꼬집으며 버틴다', p: s => .6, win: { fx: { rep: 3, mind: -1 }, text: '임무 완수. 교대 시간에 동기를 깨우며 괜히 뿌듯했다.' }, lose: { fx: { rep: -3, mind: -2 }, text: '잠깐 존 사이 순찰자에게 걸렸다. 다음엔 정말 안 졸 거야.' } },
      { t: '창밖 풍경을 보며 상념에 잠긴다', fx: { mind: 2, skill: 1 }, text: '고요한 밤하늘에 별이 보였다. 이상하게 마음이 가라앉는다.' },
    ] },
  { id: 't_march', order: 4, title: '20km 행군', scene: 'march', br: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'],
    text: '4주차, 군장을 메고 20km를 걷는다. 발바닥에 물집이 잡히고 다리가 후들거린다.',
    choices: [
      { t: '쓰러지는 동기를 부축한다', fx: { bond: 8, body: -4 }, text: '"고맙다…" 그 한마디에 군장이 조금 가벼워졌다.', hl: '훈련소 행군에서 동기를 부축해 함께 완주함' },
      { t: '이를 악물고 혼자 걷는다', fx: { body: -6, rep: 4, mind: -2 }, text: '마지막 오르막에서 해가 떠올랐다. 걸어냈다는 감각이 묘하게 짜릿하다.' },
      { t: '속도를 맞춰 무리 없이 걷는다', fx: { body: -3, rep: 1 }, text: '페이스 조절 덕에 큰 무리 없이 완주했다.' },
    ] },
  { id: 't_navy', order: 2.5, auto: true, title: '함상 체험·수영 훈련', scene: 'ship', br: ['navy'],
    text: '구명조끼를 입고 풀에 뛰어든다. 수영 못 하던 동기가 의외로 제일 열심히 한다.',
    fx: { body: -2, bond: 3, skill: 2 }, result: '물에 들어갔다 나오자 어깨가 가볍다. 해군의 첫 신고식을 무사히 마쳤다.' },
  { id: 't_marine', order: 2.5, auto: true, title: '해병 정신 교육과 갯벌 훈련', scene: 'beach', br: ['marine'],
    text: '"해병은 안 되면 되게 하라!" 갯벌에서 구르며 함성을 지르면 동기들과의 거리는 좁혀진다.',
    fx: { body: -5, bond: 6, rep: 4, mind: -2 }, result: '온몸이 진흙투성이가 됐지만 서로의 얼굴을 보며 웃는다. 이상한 소속감이 생겼다.', hl: '해병대 신병교육대의 갯벌 훈련을 함께 버텨 냄' },
  { id: 't_af', order: 2.5, auto: true, title: '제식·정훈 교육', scene: 'runway', br: ['af'],
    text: '제식 훈련과 항공 안전 교육. 공군은 기본이 정확해야 한다는 교관의 한마디가 인상 깊다.',
    fx: { rep: 3, skill: 2 }, result: '각 잡힌 걸음걸이가 몸에 배기 시작한다.' },
  { id: 't_katusa', order: 5, title: '카투사교육대 영어 배치고사', scene: 'katusa', br: ['katusa'],
    text: '훈련소를 마치고 카투사교육대로 옮겼다. 영어 배치고사와 군사 영어 시험이 시작된다. 교관이 빠른 영어로 질문을 던진다.',
    choices: [
      { t: '아는 단어를 총동원해 대답한다', p: s => .5 + s.stats.skill / 300, win: { fx: { skill: 4, rep: 4 }, text: '"Good job." 말이 통하자 자신감이 확 올랐다.' }, lose: { fx: { rep: -1, mind: -2 }, text: '문법이 꼬였지만 눈치로 겨우 버텼다. 현장에서 늘겠지.' } },
      { t: '못 알아들은 부분을 되묻는다', fx: { skill: 2, rep: 1 }, text: '"Could you say that again?" 의외로 좋은 인상을 줬다.' },
    ] },
  { id: 't_katusa_hold', order: 5.6, title: '홀드 오버의 공포', scene: 'katusa', br: ['katusa'],
    text: '교육대 막바지 체력 검정과 군사 영어 시험. 기준에 못 미치면 홀드 오버(유급)가 되어 다음 기수와 함께 지내야 한다.',
    choices: [
      { t: '밤새 암기하고 체력 기준을 맞춘다', p: s => .55 + s.stats.body / 400 + s.stats.skill / 400, win: { fx: { rep: 5, mind: 2 }, text: '합격선을 넘겼다! 수료 명단에 이름이 올라가 있는 걸 보고 주먹을 쥐었다.', hl: '카투사교육대에서 홀드 오버 위기를 넘기고 수료함' }, lose: { fx: { mind: -4, rep: -2 }, text: '한 종목이 아슬아슬하게 모자랐다. 재시험 끝에 가까스로 통과했지만 마음이 철렁했다.' } },
      { t: '운에 맡기고 평소대로 한다', fx: { mind: -1 }, text: '결과는 무난. 기준선 근처에서 살아남았다.' },
    ] },
  { id: 't_marine_redname', order: 5.8, auto: true, title: '극기주 행군과 빨간 명찰', scene: 'beach', br: ['marine'],
    text: '6주 훈련의 마지막, 극기주 행군을 마쳤다. 잔잔한 음악 속에 그동안의 훈련 영상이 흐르고, 가슴에 빨간 명찰이 달린다. 이 순간부터 교관들은 우리를 "신병"이 아니라 "해병"이라고 부른다.',
    fx: { rep: 10, mind: 8, bond: 6 }, result: '"이제 진짜 해병이다." 옆의 동기들과 어깨를 맞대고 서 있다. 이 순간만큼은 누구도 부럽지 않다.', hl: '해병대 극기주 행군을 마치고 빨간 명찰을 받음' },
  { id: 't_civil_wait', order: 2, auto: true, title: '근무지 배치 발표를 기다리며', scene: 'town', br: ['civil'],
    text: '근무지를 직접 고른 사람도, 결원이 나는 곳으로 자동 배치된 사람도 숨을 죽이고 있다. 복지시설이나 지하철만은 피하고 싶다는 사람이 많다.',
    fx: { mind: -1, bond: 2 }, result: '다 함께 긴장하며 기다리는 시간. 묘한 연대감이 생긴다.' },
];

/* ---------- 서비스 이벤트 ----------
   r:[최소,최대 계급], b: 군종, tags: 유닛 태그 중 하나라도, season, need: 조건 함수, w 가중치,
   auto: 선택 없음, hl: 하이라이트(후일담 기록) */
const EVENTS = [
  /* ===== 공통 ===== */
  { id: 'e_homesick', r: [0, 1], w: 2, title: '향수병', text: '자기 전 불이 꺼지자 갑자기 집 생각이 밀려온다. 가족 얼굴이 계속 떠오른다.',
    choices: [
      { t: '편지를 쓴다', fx: { mind: 4, skill: 1 }, text: '펜 끝이 떨렸지만 쓰고 나니 속이 한결 가볍다.' },
      { t: '동기와 수다를 떤다', fx: { bond: 4, mind: 2 }, text: '"나도 그래." 작은 목소리의 수다가 새벽까지 이어졌다.' },
      { t: '꾹 참는다', fx: { mind: -4, rep: 1 }, text: '이불을 뒤집어쓰고 눈을 감았다. 내일은 조금 낫겠지.' },
    ] },
  { id: 'e_lost', r: [0, 1], w: 1.4, auto: true, title: '생활관을 못 찾는다', text: '화장실에서 돌아오는 길에 복도를 잘못 들었다. 비슷비슷한 문들이 모두 같아 보인다.',
    fx: { mind: -1, rep: -1, bond: 2 }, result: '지나가던 선임이 웃으며 방향을 알려 줬다. 얼굴은 빨개졌지만 첫 대화가 생겼다.' },
  { id: 'e_choco', r: [0, 2], w: 1.8, auto: true, title: '선임의 간식', text: '취침 전, 선임이 말없이 초코파이를 건넨다. "먹고 자라."',
    fx: { bond: 3, mind: 3 }, result: '초코파이 하나에 이렇게 감동할 줄이야. 군대는 정말 신기한 곳이다.' },
  { id: 'e_night', r: [1, 3], w: 1.4, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '불침번 근무', scene: 'night', text: '새벽 두 시. 불침번 근무 중이다. 가장 기피되는 말전초는 아니지만 어둠 속 복도를 한 바퀴 돌고 나니 아직 한 시간이나 남았다.',
    choices: [
      { t: '꿋꿋이 순찰한다', p: s => .65, win: { fx: { rep: 3 }, text: '순찰이 끝날 즈음 선임이 "수고했다"고 말해 주었다.' }, lose: { fx: { rep: -3, mind: -2 }, text: '잠깐 졸다 걸렸다. 다음엔 절대 앉지 않는다.' } },
      { t: '틈틈이 책을 읽는다', fx: { skill: 3, mind: -1 }, text: '조용한 시간을 활용했다. 의외로 집중이 잘 됐다.' },
    ] },
  { id: 'e_px', r: [1, 3], w: 2.4, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '월급날 PX', text: '월급이 들어온 날. 나라사랑카드를 챙겨 PX로 향한다. 냉동식품 코너 앞에 이미 줄이 늘어서 있다.',
    choices: [
      { t: '치킨·냉동식품 파티', fx: { mind: 6, money: -12, body: 1 }, text: '전자레인지에서 나오는 냄새만으로 행복했다.' },
      { t: '적금을 늘린다', fx: { money: 15, mind: -1 }, text: '장병내일준비적금 통장을 들여다보니 든든하다. 정부 매칭까지 붙으니 전역 때 목돈이 기대된다.' },
      { t: '동기·후임에게 쏜다', fx: { bond: 6, rep: 2, money: -15 }, text: '다들 신나서 한바탕 웃었다. 지갑은 가벼워졌지만 마음은 무거워지지 않는다.' },
    ] },
  { id: 'e_inspect', r: [1, 3], w: 2, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '검열 대비 대청소', text: '내일 상급 부대 검열이 온다. 생활관, 창고, 화장실 모두 대청소다.',
    choices: [
      { t: '열심히 닦는다', fx: { body: -2, rep: 4 }, text: '"야, 광이 난다 광이." 간부가 한참 쳐다보다 고개를 끄덕였다.' },
      { t: '요령껏 한다', p: s => .5, win: { fx: { rep: 1, mind: 2 }, text: '효율적으로 끝내고 짬을 냈다. 머리를 쓴 보람이 있다.' }, lose: { fx: { rep: -3 }, text: '검열관이 먼지 쌓인 구석을 정확히 찾아냈다. 지적 사항 1건.' } },
      { t: '청소 도구를 담당한다', fx: { bond: 3, mind: 1 }, text: '걸레와 빗자루를 나누어 주며 슬슬 분위기를 띄웠다.' },
    ] },
  { id: 'e_cert', r: [1, 3], w: 2, title: '자격증 접수', text: '부대에서 자격증 시험을 접수받는다. 한국사, 컴퓨터활용능력, 어학 시험까지 있다.',
    choices: [
      { t: '밤새 공부한다', fx: { skill: 10, mind: -3, body: -1 }, text: '일과 후 책상 앞에서 보낸 시간이 쌓였다. 합격 문자가 도착했다.', hl: '군 복무 중 자격증 시험에 합격함' },
      { t: '기출문제만 푼다', fx: { skill: 5 }, text: '요령껏 준비해 아슬아슬하게 합격했다.' },
      { t: '이번엔 쉰다', fx: { mind: 4 }, text: '쉬는 날에는 푹 쉬기로 했다. 다음 기회에.' },
    ] },
  { id: 'e_sports', r: [1, 3], w: 2, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '부대 체육대회', scene: 'camp', text: '일 년에 한 번 열리는 체육대회. 축구 경기에서 골키퍼 자리가 비었다.',
    choices: [
      { t: '골키퍼를 자원한다', p: s => .4 + s.stats.body / 250, win: { fx: { rep: 7, bond: 5 }, text: '결정적인 선방! 모두가 환호하며 번쩍 들어 올렸다.', hl: '체육대회에서 결정적인 선방으로 영웅이 됨' }, lose: { fx: { rep: -2, bond: 3 }, text: '공이 다리 사이로 쏙. 그래도 분위기는 폭소였다.' } },
      { t: '응원단장을 맡는다', fx: { bond: 6, mind: 3, body: -1 }, text: '목이 쉬도록 외쳤다. 이상하게 이게 제일 신난다.' },
      { t: '조용히 구경한다', fx: { mind: 1, rep: -1 }, text: '벤치에서 박수만 쳤다. 편하긴 한데 어딘가 아쉽다.' },
    ] },
  { id: 'e_rain', r: [1, 3], w: 1.5, season: 'summer', b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '폭우 속 배수로 작업', scene: 'rain', text: '장마철 폭우로 부대 안에 물이 찼다. 삽을 들고 배수로를 정리해야 한다.',
    choices: [
      { t: '앞장서서 삽질한다', fx: { body: -5, rep: 5 }, text: '온몸이 흙탕물에 젖었지만 물길이 뚫리자 박수가 나왔다.' },
      { t: '요령껏 쉬엄쉬엄', fx: { body: -2, rep: -1 }, text: '비 맞으면서도 살짝 요령을 피웠다. 눈치가 늘었다.' },
    ] },
  { id: 'e_snow', r: [0, 3], w: 2, season: 'winter', b: ['army', 'navy', 'af', 'marine', 'katusa', 'sangun'], title: '제설 작업', scene: 'snow', text: '눈 예보가 뜨는 순간부터 부대 분위기가 가라앉았다. 밤새 눈이 쌓였고, 기상 직후 넉가래와 빗자루를 들고 모인다.',
    choices: [
      { t: '앞장서서 쓸어낸다', fx: { body: -4, rep: 4, mind: 1 }, text: '눈이 반짝이는 아침 햇살 아래, 길이 하나 열렸다. 뿌듯하다.' },
      { t: '눈치 보며 대충한다', fx: { body: -1, rep: -2 }, text: '허리는 지켰지만 간부의 시선이 따갑다.' },
      { t: '눈사람을 만든다', fx: { mind: 5, bond: 3, rep: -1 }, text: '즉석 눈사람이 생활관 입구에 서 있다. 모두가 웃으며 지나간다.' },
    ] },
  { id: 'e_cold', r: [1, 3], w: 1.6, season: 'winter', tags: ['combat'], title: '혹한기 훈련', scene: 'snow', text: '영하 15도 야외 숙영. A형 텐트는 얇고, 전투화는 비닐에 싸서 침낭에 넣지 않으면 아침에 돌처럼 얼어 있다. 핫팩은 금방 식는다.',
    choices: [
      { t: '끝까지 야외 취침을 완수한다', fx: { body: -6, rep: 6, mind: -2 }, text: '손발은 얼었지만 "내가 이걸 해냈다"는 감각이 묘하게 짜릿하다.', hl: '혹한기 훈련을 끝까지 완수함' },
      { t: '핫팩을 겹겹이 챙겨 버틴다', fx: { body: -3, rep: 2, mind: -1 }, text: '전략적으로 핫팩을 배치해 가까스로 버텼다.' },
      { t: '의무대를 찾는다', fx: { body: 2, rep: -4, mind: -1 }, text: '몸은 편해졌지만 마음은 불편하다. 다음 훈련에선 꼭 해내리라.' },
    ] },
  { id: 'e_newjr', r: [2, 3], w: 3, once: true, flag: 'junior', title: '첫 후임이 들어왔다', text: '드디어 내 아래에 후임이 생겼다. 어색하게 차렷 자세로 서 있는 모습을 보니 예전의 내가 떠오른다.',
    choices: [
      { t: '친절하게 챙겨 준다', fx: { bond: 6, mind: 2, rep: 1 }, text: '"모르는 건 언제든 물어봐." 후임의 얼굴에 안도가 번졌다.' },
      { t: '예의 위주로 엄격하게', fx: { rep: 4, bond: -2 }, text: '규율은 잡혔지만 분위기가 조금 서늘하다.' },
      { t: '어색해서 피한다', fx: { mind: -1, bond: -1 }, text: '말을 걸어야 하는데 입이 안 떨어진다. 시간이 해결해 주겠지.' },
    ] },
  { id: 'e_phone', r: [1, 3], w: 2.4, title: '휴대전화 사용 시간', text: '평일 일과 후(저녁 6시~9시)에만 휴대전화가 내 손에 돌아온다. 이 세 시간이 하루의 하이라이트다.',
    choices: [
      { t: '부모님과 영상통화한다', fx: { mind: 5, bond: 1 }, text: '"밥은 잘 먹니?" 평범한 안부가 가장 따뜻하다.' },
      { t: '게임과 영상을 본다', fx: { mind: 4, body: -1 }, text: '시간 가는 줄 모르고 놀았다. 이게 평화다.' },
      { t: '전자책을 읽는다', fx: { skill: 4, mind: 1 }, text: '조용히 책을 읽었다. 의외의 몰입감.' },
    ] },
  { id: 'e_gfletter', r: [0, 3], w: 3, need: s => s.gf && s.gfLove > 20, title: '곰신의 편지', text: '"오늘도 고생했어. 보고 싶다." 우편함에 손편지와 사진이 도착했다.',
    choices: [
      { t: '길게 답장을 쓴다', fx: { gf: 6, mind: 4 }, text: '한 줄씩 정성껏 썼다. 쓰는 동안 마음이 한결 포근해졌다.' },
      { t: '짧게 안부를 전한다', fx: { gf: 1, mind: 1 }, text: '짧지만 진심을 담아 전했다.' },
      { t: '전화를 건다', fx: { gf: 4, mind: 3, money: -1 }, text: '짧은 통화였지만 서로의 목소리를 듣고 한참을 웃었다.' },
    ] },
  { id: 'e_gfdoubt', r: [1, 3], w: 2, need: s => s.gf && s.gfLove < 55, title: '연락이 뜸해진 곰신', text: '요즘 연락이 뜸하다. 답장은 짧고 전화도 자꾸 늦게 받는다.',
    choices: [
      { t: '솔직하게 전화로 이야기한다', p: s => .6, win: { fx: { gf: 12, mind: 2 }, text: '"사실 나도 불안했어." 긴 통화 끝에 서로의 마음이 정리됐다.' }, lose: { fx: { gf: -8, mind: -4 }, text: '대화가 어긋났다. 전화를 끊고 한참 멍하니 앉아 있었다.' } },
      { t: '모른 척 넘긴다', fx: { gf: -6, mind: -1 }, text: '괜히 분위기를 깨고 싶지 않았다. 그런데 마음 한구석이 계속 신경 쓰인다.' },
      { t: '휴가 때 만나서 풀자고 한다', fx: { gf: 3, mind: 1 }, text: '"휴가 나가면 보자." 약속 하나가 위안이 된다.' },
    ] },
  { id: 'e_visit', r: [1, 3], w: 2.2, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '면회', text: '가족과 친구가 면회를 온다는 연락을 받았다. 외출까지 허락받았다.',
    choices: [
      { t: '맛집으로 외출한다', fx: { mind: 8, body: 3, money: -5 }, text: '정말 오랜만에 먹는 사회의 음식. 눈물 나게 맛있다.' },
      { t: '부대 안에서 시간을 보낸다', fx: { mind: 5, money: -1 }, text: '벤치에 앉아 이런저런 이야기를 나누었다. 가장 평범한 대화가 가장 좋다.' },
      { t: '곰신과 데이트한다', need: s => s.gf, fx: { gf: 8, mind: 8, money: -6 }, text: '손을 잡고 거리를 걷는 것만으로 충분했다. 시간이 너무 빨리 흘렀다.' },
    ] },
  { id: 'e_award', r: [2, 3], w: 3, need: s => s.stats.rep >= 62 && !s.flags.award, flag: 'award', auto: true, hl: '모범 장병 표창과 포상휴가를 받음', title: '모범 장병 표창', text: '분기 시상식에서 이름이 호명된다. 간부가 직접 상장을 건네며 악수를 청한다.',
    fx: { rep: 4, mind: 8, leave: 3, bond: 2 }, result: '표창장과 함께 포상휴가 3일! 부모님께 자랑하고 싶어 전화기를 만지작거린다.' },
  { id: 'e_pt', r: [1, 3], w: 1.8, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '체력검정', scene: 'camp', text: '팔굽혀펴기 2분, 윗몸일으키기 2분, 3km 달리기까지. 특급전사 기준을 넘기면 3~5일 포상휴가와 조기진급이 걸려 있다.',
    choices: [
      { t: '특급에 도전한다', p: s => .25 + s.stats.body / 200, win: { fx: { rep: 6, leave: 2, mind: 3, body: -1 }, text: '결승선을 통과하자 기록원이 "특급입니다!"를 외쳤다. 포상휴가까지 받았다.', hl: '체력검정 특급을 달성해 포상휴가를 받음' }, lose: { fx: { body: -3, mind: -1 }, text: '마지막 한 바퀴에서 힘이 풀렸다. 아쉽게 1급.' } },
      { t: '적당히 한다', fx: { body: -1 }, text: '무난한 기록으로 마쳤다. 다리가 후들거리긴 한다.' },
    ] },
  { id: 'e_burger', r: [0, 3], w: 1.4, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '군대리아의 날', text: '오늘 아침은 군대리아(빵식). 빵 두 개에 패티, 양배추 샐러드, 딸기잼, 스프와 우유까지. 각자 직접 조립해 먹는 바로 그 맛이다.',
    fx: { mind: 3 }, result: '"오늘 점심은 이거지." 모두의 표정이 한결 밝아졌다.' },
  { id: 'e_ramen', r: [2, 3], w: 1.6, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '야식 라면 파티', text: '점호 후 몰래 끓인 라면 냄새가 은근히 번진다. 다들 숨죽이며 한 젓가락씩 나눠 먹는다.',
    fx: { bond: 4, mind: 4, body: -1 }, result: '이 맛에 군대에서 라면을 먹는 거다. 모두가 같은 표정을 지었다.' },
  { id: 'e_stars', r: [0, 3], w: 1.2, auto: true, scene: 'night', tags: ['gop', 'island', 'rear', 'base'], title: '별이 쏟아지는 밤', text: '근무 중 고개를 들자 하늘 가득 별이 박혀 있다. 도시에서는 볼 수 없던 풍경이다.',
    fx: { mind: 4, skill: 1 }, result: '"이런 하늘이 있었구나." 잠깐이지만 모든 고단함이 희미해졌다.' },
  { id: 'e_counsel', r: [0, 3], w: 120, need: s => s.stats.mind <= 26 && !s.flags.counsel, flag: 'counsel', title: '상담관과의 면담', text: '표정이 어두워 보였는지 병영생활전문상담관이 면담을 제안한다. 벽에는 "국방헬프콜 1303" 안내문이 붙어 있다.',
    choices: [
      { t: '있는 그대로 털어놓는다', fx: { mind: 16, bond: 3 }, text: '말하는 동안 숨이 트였다. 상담관은 끝까지 들어 주고 필요한 도움을 연결해 주었다.' },
      { t: '괜찮다고 말한다', fx: { mind: 4, rep: 1 }, text: '아직은 입이 안 떨어진다. 상담관은 "언제든 와도 된다"고 말해 주었다.' },
      { t: '국방헬프콜 1303에 전화한다', fx: { mind: 13 }, text: '익명으로 털어놓자 조금 편해졌다. 혼자가 아니라는 사실을 알게 되었다.' },
    ] },
  { id: 'e_hospital', r: [0, 3], w: 120, need: s => s.stats.body <= 22 && !s.flags.hospital, flag: 'hospital', auto: true, title: '의무대 입실', text: '몸이 말을 듣지 않는다. 열이 높고 어지럽다. 결국 의무대에서 며칠 입실하게 되었다.',
    fx: { body: 20, mind: 6, rep: -2 }, result: '침대에 누워 있으니 몸이 풀린다. 의무병이 따뜻한 죽을 건네준다. 건강이 최고다.' },
  { id: 'e_plan', r: [3, 3], w: 100, need: s => s.daysLeft <= 130 && !s.flags.plan, flag: 'plan', title: '전역 후 계획', text: '전역이 눈앞이다. 앞으로 무엇을 할 건지 슬슬 정해야 한다.',
    choices: [
      { t: '복학해서 학업에 집중한다', fx: { skill: 4, mind: 2 }, set: { plan: 'study' }, text: '전공 책을 몰래 펼쳐 보았다. 낯선 용어가 반갑다.' },
      { t: '취업 준비에 올인한다', fx: { skill: 6, mind: -1 }, set: { plan: 'job' }, text: '틈날 때마다 자기소개서를 써 보았다. 처음엔 어색해도 점점 다듬어진다.' },
      { t: '여행과 휴식부터 챙긴다', fx: { mind: 6 }, set: { plan: 'travel' }, text: '전역하자마자 어디로 갈지 지도를 펼쳐 놓았다. 꿈만 꿔도 신난다.' },
    ] },
  { id: 'e_mentor', r: [3, 3], w: 2.4, need: s => !s.flags.mentor, flag: 'mentor', title: '말년 병장의 역할', text: '이제 후임들이 나를 바라본다. 분위기를 이끄는 건 결국 가장 오래된 사람의 몫이다.',
    choices: [
      { t: '솔선수범해서 이끈다', fx: { rep: 6, bond: 5, body: -2 }, text: '"저 선임처럼 되고 싶다." 후임의 한마디가 오래 남았다.', hl: '말년에 솔선수범해 후임들의 존경을 받음' },
      { t: '조용히 지켜보며 조언한다', fx: { bond: 4, rep: 2 }, text: '필요할 때만 한마디씩. 그래서 더 믿음직한 선임이 됐다.' },
      { t: '남은 기간을 편하게 보낸다', fx: { mind: 5, rep: -3, bond: -2 }, text: '마음은 편하지만 눈치가 보인다. 뒷모습이 쓸쓸하다.' },
    ] },
  { id: 'e_jrtrouble', r: [2, 3], w: 2, need: s => s.flags.junior, title: '힘들어하는 후임', text: '어느 날부터 후임의 표정이 부쩍 어둡다. 밥도 거의 먹지 않는다.',
    choices: [
      { t: '밥을 먹이며 이야기를 들어 준다', fx: { bond: 7, mind: 1 }, text: '"사실 그동안 많이 힘들었어요." 이야기를 들어 주는 것만으로도 후임의 눈빛이 달라졌다.', hl: '힘들어하는 후임의 이야기를 들어 주고 힘이 되어 줌' },
      { t: '간부에게 상황을 알린다', fx: { rep: 2, bond: 2, mind: 2 }, text: '간부가 즉시 면담을 잡았다. 후임이 고개를 숙이며 고맙다고 말했다.' },
      { t: '모른 척한다', fx: { bond: -5, mind: -2 }, text: '마음 한구석이 계속 불편하다. 괜히 눈을 피하게 된다.' },
    ] },
  { id: 'e_leaveprompt', r: [1, 3], w: 100, repeat: true, need: s => s.leave >= 5 && s.week >= s.trainWeeks + 12 && s.week - Math.max(s.lastLeaveWeek, s.flags.leaveAsk || -99) >= 8 && s.daysLeft > 30,
    onChoose: (s, ch) => { if (!ch.leaveMenu) s.flags.leaveAsk = s.week; }, /* 거절하면 8주 뒤에 다시 묻는다 */
    title: '휴가를 나갈까요?', text: s => `남은 휴가는 ${Math.floor(s.leave)}일. 휴가증과 군번줄을 챙기고, 복귀는 저녁 점호 전까지. 오랜만에 부대 밖 공기를 마셔 볼까?`,
    choices: [
      { t: '휴가 나간다!', leaveMenu: true, text: '' },
      { t: '더 모아서 나중에 쓴다', fx: { mind: -1 }, text: '조금 더 참기로 했다. 달력 위 날짜들을 한 칸씩 지워 나간다.' },
    ] },
  { id: 'e_quiet', w: .01, auto: true, title: '평화로운 한 주', text: '특별한 일은 없었다. 아침 점호, 일과, 저녁 점호. 같은 일상이 이어진다.', fx: { mind: 1 }, result: '아무 일 없는 하루도 어쩌면 감사해야 할 일이다.' },

  /* ===== 해군 ===== */
  { id: 'n_seasick', r: [0, 1], w: 3, tags: ['ship'], title: '멀미와의 전쟁', scene: 'ship', text: '파도가 높아 배가 심하게 흔들린다. 속이 울렁거린다.',
    choices: [
      { t: '멀미약을 먹고 갑판에서 바람을 쐰다', fx: { mind: -2, body: -2 }, text: '바닷바람이 얼굴을 때리자 조금 낫다. 수평선을 바라보는 게 비법이라고 한다.' },
      { t: '참고 업무를 계속한다', fx: { rep: 3, body: -4, mind: -2 }, text: '식은땀을 흘리면서도 근무를 마쳤다. 선임이 어깨를 툭 쳐 주었다.' },
      { t: '누워서 쉰다', fx: { body: 1, rep: -3 }, text: '일단 컨디션부터 회복했다. 간부의 시선이 다소 따갑다.' },
    ] },
  { id: 'n_storm', r: [1, 3], w: 2, auto: true, tags: ['ship'], title: '태풍 피항', scene: 'ship', text: '태풍을 피해 함정이 항구로 급히 피항한다. 모두가 하루 종일 배가 흔들리는 속에서 고생한다.',
    fx: { body: -4, bond: 4, rep: 2 }, result: '다 같이 속을 비우며 어쩐지 전우애가 생겼다. 이 집단의 일원이라는 확신이 생겼다.' },
  { id: 'n_sunrise', r: [0, 3], w: 2, auto: true, tags: ['sea'], b: ['navy'], title: '바다 위의 일출', scene: 'ship', text: '당직을 서던 새벽, 수평선 너머로 해가 떠오른다. 파도 위에 금빛이 번진다.',
    fx: { mind: 6 }, result: '"이건 바다에서만 볼 수 있는 풍경이다." 한동안 말없이 서 있었다.', hl: '바다 위에서 맞은 일출이 오래 기억에 남음' },
  { id: 'n_port', r: [1, 3], w: 2, tags: ['ship'], title: '입항 외출', scene: 'ship', text: '며칠간의 항해 끝에 입항했다. 오늘은 상륙 외출이 허락됐다.',
    choices: [
      { t: '해산물 맛집에 간다', fx: { mind: 8, money: -5 }, text: '싱싱한 회가 입에서 녹는다. 파도 소리와는 또 다른 행복이다.' },
      { t: '쇼핑하고 선물을 산다', fx: { mind: 5, money: -8, bond: 2 }, text: '가족과 동기들에게 줄 선물을 한가득 샀다.' },
      { t: '숙소에서 푹 쉰다', fx: { body: 4, mind: 3 }, text: '흔들리지 않는 바닥이 이렇게 반가울 줄이야.' },
    ] },

  /* ===== 공군 ===== */
  { id: 'f_jet', r: [0, 3], w: 2, auto: true, tags: ['air'], title: '전투기 이륙', scene: 'runway', text: '활주로에서 전투기가 굉음과 함께 날아오른다. 땅이 울리고 가슴이 두근거린다.',
    fx: { mind: 3, skill: 1 }, result: '아무리 봐도 질리지 않는 풍경이다. "저걸 내가 지켜 주고 있구나."' },
  { id: 'f_fod', r: [0, 2], w: 2, tags: ['air'], title: 'FOD 줍기', scene: 'runway', text: '활주로 위 이물질(FOD)을 줄지어 서서 줍는다. 작은 나사 하나가 큰 사고의 원인이 될 수 있다.',
    choices: [
      { t: '꼼꼼히 훑는다', fx: { rep: 4, body: -2 }, text: '볼트 하나를 찾아냈다. 간부가 "큰 거 하나 했다"며 칭찬한다.' },
      { t: '대충 훑는다', fx: { rep: -2, mind: 1 }, text: '무사히 지나갔지만 괜히 마음이 찜찜하다.' },
    ] },
  { id: 'f_airshow', r: [1, 3], w: 1.4, auto: true, tags: ['air'], title: '에어쇼 지원', scene: 'runway', text: '기지 개방 행사를 도우며 시민들을 안내한다. 아이들이 비행기 앞에서 환하게 웃는다.',
    fx: { mind: 5, rep: 3 }, result: '"고맙습니다, 군인 아저씨!" 이 한마디에 한 달 치 피곤이 풀렸다.' },

  /* ===== 해병대 ===== */
  { id: 'm_boat', r: [0, 3], w: 3, tags: ['sea'], b: ['marine'], title: '고무보트 상륙 훈련', scene: 'beach', text: '고무보트를 들고 바다에 뛰어든다. 노를 맞춰 젓지 않으면 제자리를 맴돈다.',
    choices: [
      { t: '온 힘을 다해 노를 젓는다', fx: { body: -6, rep: 6, bond: 4 }, text: '구호에 맞춰 일제히 노를 저었다. 해변이 가까워질수록 함성이 커졌다.' },
      { t: '타이밍만 맞춰 가볍게 젓는다', fx: { body: -3, rep: 1 }, text: '무리 없이 도착했다. 체력 안배도 실력이다.' },
    ] },
  { id: 'm_run', r: [1, 3], w: 2, auto: true, b: ['marine'], title: '해변 구보', scene: 'beach', text: '모래사장 위 아침 구보. 발이 푹푹 빠지지만 파도 소리를 들으며 달리는 맛이 있다.',
    fx: { body: 3, mind: -1 }, result: '모래 위를 달리고 나니 허벅지가 터질 것 같다. 그래도 한 단계 강해진 기분이다.' },
  { id: 'm_island', r: [0, 3], w: 2.4, auto: true, tags: ['island'], title: '섬에서 보는 일몰', scene: 'beach', text: '섬 근무의 하루가 끝나가는 시간. 붉게 물든 서해 수평선 위로 군함이 천천히 지나간다.',
    fx: { mind: 4, skill: 1 }, result: '이곳에서만 볼 수 있는 풍경. 외출은 어렵지만 이 석양은 늘 위안이 된다.' },

  /* ===== 카투사 ===== */
  { id: 'k_english', r: [0, 3], w: 3, tags: ['us'], title: '영어 오해', scene: 'katusa', text: '미군 병장이 빠르게 무언가를 부탁한다. 반쯤은 알아들었고, 반쯤은 모르겠다.',
    choices: [
      { t: '정중하게 되묻는다', fx: { skill: 3, rep: 1 }, text: '"Could you say that again?" 한 번 더 말해 주니 이해가 쏙 들어왔다.' },
      { t: '아는 척 대답한다', p: s => .5, win: { fx: { rep: 3, skill: 2 }, text: '눈치껏 맞는 답을 했다. 미군이 엄지를 올렸다.' }, lose: { fx: { rep: -3, mind: -2 }, text: '완전히 엉뚱한 물건을 가져갔다. 그 자리에서 모두가 폭소했다.' } },
    ] },
  { id: 'k_chow', r: [0, 3], w: 2, auto: true, tags: ['us'], title: '미군 식당', scene: 'katusa', text: '푸짐한 아침 메뉴가 줄지어 늘어서 있다. 팬케이크와 베이컨, 오믈렛까지. 식판이 한가득 채워진다.',
    fx: { mind: 6, body: 2 }, result: '군대 식당이 이렇게 풍성할 수 있다니. 한국 군대 동기들이 부러워할 풍경이다.' },
  { id: 'k_holiday', r: [1, 3], w: 1.6, auto: true, tags: ['us'], title: '미군 연휴', scene: 'katusa', text: '미군 공휴일과 한국 공휴일이 겹쳐 길게 이어졌다. 기지 전체가 한적하다.',
    fx: { mind: 6, leave: 2 }, result: '평소엔 보기 힘든 여유. 카투사의 숨은 장점이다.' },
  { id: 'k_buddy', r: [1, 3], w: 1.8, auto: true, tags: ['us'], title: '미군 친구', scene: 'katusa', text: '함께 일하는 미군 병사와 점점 친해졌다. 한국 음식을 소개해 주고, 그는 미국 이야기를 들려준다.',
    fx: { skill: 6, bond: 4, mind: 3 }, result: '언어와 문화를 동시에 배운 기분이다. 이 경험은 전역 후에도 오래 남을 것이다.', hl: '미군 친구와 우정을 쌓고 영어가 부쩍 늘음' },

  /* ===== 상근예비역·사회복무 ===== */
  { id: 'c_commute', r: [0, 3], w: 3, tags: ['commute'], title: '출근길 만원 버스', scene: 'town', text: '오늘따라 버스가 만원이다. 지각은 안 되는데 시간은 빠듯하다.',
    choices: [
      { t: '일찍 나서서 여유롭게 간다', fx: { skill: 2, mind: 2, body: -1 }, text: '이어폰으로 음악을 들으며 걸었다. 출근이 이렇게 기분 좋은 일이었나.' },
      { t: '아슬아슬하게 도착한다', p: s => .6, win: { fx: { mind: -1 }, text: '아슬아슬하게 도착. 숨을 고르며 자리에 앉았다.' }, lose: { fx: { rep: -3, mind: -2 }, text: '지각이다. 담당자가 말없이 시계를 바라보았다.' } },
    ] },
  { id: 'c_complaint', r: [0, 3], w: 3, tags: ['office', 'civil'], b: ['civil'], title: '진상 민원인', scene: 'town', text: '창구에 큰 목소리가 울린다. 서류 때문에 화가 난 민원인이 눈앞에서 항의한다.',
    choices: [
      { t: '웃으며 끝까지 응대한다', fx: { mind: -3, rep: 5 }, text: '"고맙네, 젊은이." 마지막에는 인사까지 받았다. 식은땀이 흘렀지만 뿌듯하다.' },
      { t: '선임 주무관에게 넘긴다', fx: { rep: -1, bond: 2 }, text: '주무관님이 능숙하게 상황을 정리했다. 뒤에서 한 수 배운다.' },
      { t: '딱 잘라 안내한다', p: s => .5, win: { fx: { rep: 2 }, text: '명확한 안내에 민원인이 수긍했다.' }, lose: { fx: { rep: -5, mind: -3 }, text: '말투가 퉁명스러웠다는 항의가 들어왔다. 반성한다.' } },
    ] },
  { id: 'c_thanks', r: [1, 3], w: 2, auto: true, tags: ['civil'], b: ['civil'], title: '감사 편지', scene: 'town', text: '어르신 한 분이 서투른 손글씨로 쓴 감사 편지를 건네신다. "친절하게 알려 줘서 고마워요."',
    fx: { mind: 8, rep: 3 }, result: '봉투를 책상 서랍에 조용히 넣어 두었다. 힘든 날 꺼내 보면 좋을 것 같다.', hl: '어르신이 건넨 서툰 감사 편지를 받음' },
  { id: 'c_elder', r: [0, 3], w: 2.4, auto: true, tags: ['care'], title: '어르신 말동무', scene: 'town', text: '한 어르신이 매일 같은 자리에서 옛날이야기를 들려주신다. 처음엔 길게만 느껴졌지만 이제는 기다리게 된다.',
    fx: { mind: 5, bond: 4, skill: 1 }, result: '"자네 덕분에 요즘 살맛이 나." 그 말이 오래도록 가슴에 남는다.' },
  { id: 'c_after', r: [1, 3], w: 2, tags: ['commute'], title: '퇴근 후 약속', scene: 'town', text: '칼퇴 후 사회인처럼 퇴근길을 걷는다. 친구가 저녁 먹자는 메시지를 보냈다.',
    choices: [
      { t: '친구들과 저녁을 먹는다', fx: { mind: 6, money: -3, bond: 1 }, text: '"야, 너 이러고 군대 맞아?" 농담에 한참 웃었다.' },
      { t: '운동·자기계발에 시간을 쓴다', fx: { skill: 4, body: 3 }, text: '퇴근 후 시간이 모이니 꽤 큰 차이가 생긴다.' },
      { t: '집에서 푹 쉰다', fx: { mind: 5, body: 2 }, text: '소파에 누워 아무것도 하지 않는 호사를 누렸다.' },
    ] },
  { id: 'c_drill', r: [0, 3], w: 2, auto: true, tags: ['rear'], b: ['sangun'], title: '예비군 훈련 지원', scene: 'town', text: '예비군 훈련 기간, 탄약과 서류를 나르며 하루 종일 뛰어다닌다. 불평이 오가지만 해질 무렵엔 모두 웃는 얼굴이다.',
    fx: { body: -2, rep: 3, bond: 2 }, result: '"고생했어." 예비군 아저씨가 건넨 음료수 한 캔이 꿀맛이다.' },
  { id: 'c_alarm', r: [1, 3], w: 1.6, auto: true, b: ['sangun'], title: '새벽 비상소집', scene: 'night', text: '새벽 3시 휴대전화가 울린다. 비상소집이다. 잠에서 덜 깬 채 부대로 달려간다.',
    fx: { body: -3, mind: -2, rep: 2 }, result: '상황은 훈련으로 끝났지만 눈은 말똥말똥하다. 집에 돌아와 이불 속으로 파고들었다.' },

  /* ===== 사무·행정 ===== */
  { id: 'o_excel', r: [0, 3], w: 3, auto: true, tags: ['office'], title: '엑셀 지옥', scene: 'office', text: '하루 종일 모니터 앞에서 표를 만든다. 함수가 줄줄이 이어진다.',
    fx: { skill: 4, rep: 3, mind: -3 }, result: '어느새 단축키가 손에 익었다. 전역 후 어디서든 써먹을 수 있을 것 같다.' },
  { id: 'o_typo', r: [1, 3], w: 2, tags: ['office'], title: '공문서 오타', scene: 'office', text: '결재 직전 문서에서 큰 오타를 발견했다. 이대로면 간부에게 지적받는다.',
    choices: [
      { t: '조용히 고쳐서 제출한다', fx: { rep: 2, skill: 1 }, text: '아무도 몰랐다. 하지만 나는 알고 있다. 작은 뿌듯함이 쌓인다.' },
      { t: '간부에게 솔직히 말한다', p: s => .7, win: { fx: { rep: 5, mind: 1 }, text: '"정직한 게 최고다." 간부가 미소를 지었다.' }, lose: { fx: { rep: -2, mind: -2 }, text: '"그런 걸 이제야 말해?" 잠시 혼났지만 큰일은 아니었다.' } },
    ] },
  { id: 'o_general', r: [1, 3], w: 1.4, tags: ['office', 'seoul', 'combat'], title: '지휘관 방문', scene: 'office', text: '내일 사령관이 부대를 방문한다. 모두가 대청소와 의전 준비에 매달린다.',
    choices: [
      { t: '적극적으로 준비한다', fx: { body: -2, rep: 5, mind: -3 }, text: '완벽한 의전. 사령관이 흡족한 얼굴로 돌아갔다.' },
      { t: '슬쩍 자리를 피한다', p: s => .5, win: { fx: { mind: 3 }, text: '조용히 사라져서 한숨 돌렸다. 아무도 눈치채지 못했다.' }, lose: { fx: { rep: -4 }, text: '간부에게 딱 걸렸다. 자리 비운 이유를 설명해야 했다.' } },
    ] },
  { id: 'o_print', r: [0, 3], w: 1.4, auto: true, tags: ['office'], title: '복사기 고장', scene: 'office', text: '결재 마감 10분 전. 복사기에서 종이 걸림 경고가 뜬다.',
    fx: { mind: -2, bond: 2 }, result: '동기들과 힘을 합쳐 종이를 빼냈다. 서류는 시간 안에 제출됐다.' },

  /* ===== 전투·야전 ===== */
  { id: 'g_boar', r: [0, 3], w: 2.4, tags: ['gop'], title: '야간 경계 소동', scene: 'night', text: '새벽 경계 근무 중 풀숲에서 수상한 소리가 난다. 손에 땀이 맺힌다. 그 순간 멧돼지 한 마리가 튀어나왔다.',
    choices: [
      { t: '침착하게 상황 보고한다', fx: { rep: 5, mind: -2 }, text: '교과서처럼 보고했다. 알고 보니 멧돼지였지만 판단은 정확했다는 칭찬을 들었다.' },
      { t: '놀라서 크게 소리친다', p: s => .5, win: { fx: { rep: 2, bond: 3 }, text: '고함에 멧돼지가 도망갔다. 모두가 한바탕 웃었다.' }, lose: { fx: { rep: -3, mind: -2 }, text: '소리를 질렀다가 간부에게 호출됐다. 괜히 부끄러웠다.' } },
    ] },
  { id: 'g_fog', r: [0, 3], w: 1.6, auto: true, tags: ['gop', 'island', 'base'], title: '안개 낀 새벽 근무', scene: 'fog', text: '짙은 안개 때문에 5미터 앞도 보이지 않는다. 초소 안은 고요하고 숨소리만 들린다.',
    fx: { mind: -2, rep: 2 }, result: '시계를 몇 번이나 쳐다봤지만 시간이 느리다. 그래도 교대 시간은 결국 찾아온다.' },
  { id: 'g_ruck', r: [1, 3], w: 2, auto: true, tags: ['combat'], title: '완전군장 구보', scene: 'march', text: '완전군장을 메고 운동장을 돈다. 헬멧과 방탄복이 어깨를 짓누른다.',
    fx: { body: -5, rep: 4, mind: -2 }, result: '구보가 끝나자 다리가 후들거렸지만 한 단계 성장한 기분이다.' },
  { id: 'g_shoot', r: [1, 3], w: 1.8, tags: ['combat', 'gop'], title: '정기 사격', scene: 'camp', text: '정기 사격 평가. 이번에는 좋은 성적을 내면 포상휴가가 걸려 있다.',
    choices: [
      { t: '집중해서 쏜다', p: s => .3 + s.stats.mind / 280 + s.stats.body / 600, win: { fx: { rep: 8, leave: 2, mind: 3 }, text: '표적에 전부 명중! 특등사수 포상휴가가 걸렸다.', hl: '정기 사격에서 특등사수를 달성해 포상휴가를 받음' }, lose: { fx: { rep: 1 }, text: '평소 실력만 발휘했다. 무난한 성적.' } },
      { t: '무리하지 않는다', fx: { mind: 1 }, text: '적당히 마치고 숙소로 돌아왔다. 마음이 편하다.' },
    ] },
  { id: 'g_nightex', r: [1, 3], w: 1.6, auto: true, tags: ['combat'], title: '야간 기동 훈련', scene: 'night', text: '어둠 속에서 팀을 이뤄 이동한다. 라이트는 금지, 오직 감각에 의존한다.',
    fx: { body: -4, bond: 4, rep: 2 }, result: '말없이 서로의 등을 따라가는 시간. 이상하게 든든했다.' },

  /* ===== 보직별 ===== */
  { id: 'x_pot', r: [0, 3], w: 3, tags: ['cook'], title: '대형 솥 앞에서', scene: 'camp', text: '오늘 점심은 수백 명 분의 국. 간을 맞추는 건 온전히 내 몫이다.',
    choices: [
      { t: '소금을 정확히 맞춘다', p: s => .55 + (s.major === 'cook' ? .25 : 0), win: { fx: { rep: 6, bond: 5, mind: 3 }, text: '"오늘 국 진짜 맛있네!" 줄 선 모두의 표정이 환해졌다.', hl: '대형 솥으로 끓인 국이 부대원 모두에게 칭찬받음' }, lose: { fx: { rep: -2, mind: -2 }, text: '조금 짰다. 그래도 밥에 말아 먹으면 괜찮다고 위로받았다.' } },
      { t: '매뉴얼 그대로 만든다', fx: { rep: 2 }, text: '무난한 맛. 문제 없이 마쳤다.' },
    ] },
  { id: 'x_mud', r: [0, 3], w: 2, tags: ['driver', 'motor'], title: '차량 진흙에 빠지다', scene: 'rain', text: '비 온 뒤 흙길에서 차량 바퀴가 푹 빠졌다. 후진도, 전진도 소용없다.',
    choices: [
      { t: '다 같이 밀어서 빼낸다', fx: { body: -3, bond: 4 }, text: '한참 밀고 나서야 차가 빠졌다. 흙투성이가 된 서로를 보고 웃음이 터졌다.' },
      { t: '견인차를 요청한다', fx: { rep: -1, mind: 1 }, text: '시간은 걸렸지만 깔끔하게 해결했다. 안전이 최우선이다.' },
    ] },
  { id: 'x_net', r: [1, 3], w: 2, tags: ['comm'], title: '전산망 마비', scene: 'office', text: '갑자기 부대 전산망이 먹통이 됐다. 모두가 당황하는 사이, 문제를 해결할 사람은 나뿐이다.',
    choices: [
      { t: '원인을 추적해 복구한다', p: s => .45 + s.stats.skill / 250 + (s.major === 'eng' ? .15 : 0), win: { fx: { rep: 8, skill: 6, mind: 2 }, text: '케이블 한 가닥이 문제였다. 간부가 "너 아니면 큰일 날 뻔했다"고 말했다.', hl: '전산망 마비 사태를 직접 복구해 부대의 영웅이 됨' }, lose: { fx: { rep: -3, mind: -2 }, text: '원인을 못 찾아 결국 지원 인력이 왔다. 아쉽다.' } },
      { t: '즉시 상급 부대에 보고한다', fx: { rep: 2 }, text: '원칙대로 빠르게 보고했다. 판단은 정확했다.' },
    ] },
  { id: 'x_sick', r: [0, 3], w: 2, tags: ['medic'], title: '진료 대기 줄', scene: 'camp', text: '진료 시간마다 아픈 사람이 길게 줄을 선다. 진짜 아픈 사람과 꾀병은 한눈에 구분하기 힘들다.',
    choices: [
      { t: '꼼꼼히 문진하고 진료한다', fx: { skill: 4, rep: 3, body: -1 }, text: '한 사람씩 정확히 증상을 확인했다. 한 병사의 맹장염을 초기에 발견했다.' },
      { t: '일단 약부터 처방한다', fx: { mind: 1, rep: -1 }, text: '큰 문제는 없었지만 개운치 않은 마음이 남았다.' },
    ] },
  { id: 'x_concert', r: [1, 3], w: 2.4, tags: ['band'], auto: true, title: '위문 공연', scene: 'office', text: '부대 장병들과 지역 주민을 위한 공연 날. 무대 위 조명이 켜지고 첫 음이 울린다.',
    fx: { mind: 10, rep: 8, bond: 6 }, result: '마지막 곡이 끝나자 박수가 쏟아졌다. 악기를 든 손이 떨릴 정도로 벅찼다.', hl: '위문 공연 무대에서 큰 박수를 받음' },
  { id: 'x_lib', r: [0, 3], w: 2.4, tags: ['lib'], b: ['civil'], auto: true, title: '책 정리하는 오후', scene: 'town', text: '조용한 도서관에서 반납된 책을 정리한다. 한 권 한 권 책등을 맞추는 작업이 의외로 마음을 편하게 한다.',
    fx: { mind: 3, skill: 3 }, result: '틈틈이 읽은 책이 어느새 열 권이 넘었다.' },
  { id: 'x_trainer', r: [0, 3], w: 3, tags: ['trainer'], title: '신병을 맞이하며', scene: 'camp', text: '이제는 내가 호통치는 쪽이다. 하지만 사실 신병들의 눈빛을 보니 예전의 내가 떠오른다.',
    choices: [
      { t: '엄격하되 따뜻하게 이끈다', fx: { rep: 5, bond: 4 }, text: '"조교님 덕분에 버텼습니다." 퇴소하는 신병의 인사가 오래 남는다.' },
      { t: '규정대로만 한다', fx: { rep: 2 }, text: '실수 없이 마쳤다. 감정은 뒤로 미루는 연습이 된다.' },
    ] },
  { id: 'x_fire', r: [0, 3], w: 1.4, auto: true, tags: ['fire'], b: ['af'], title: '출동 대기', scene: 'runway', text: '사이렌이 울린다. 훈련 상황이라는 걸 알면서도 심장이 쿵쾅거린다.',
    fx: { body: -2, rep: 3 }, result: '현장 도착 시간이 단축됐다. 선임이 "이 정도면 실전도 문제없다"며 웃었다.' },
  { id: 'x_hq', r: [0, 3], w: 1.6, auto: true, tags: ['seoul'], b: ['army'], title: '출입증 확인', scene: 'office', text: '서울 한복판의 출입 게이트에서 하루를 시작한다. 출근길 지하철을 타는 평범한 직장인 같은 군 생활이다.',
    fx: { mind: 3, skill: 1 }, result: '점심시간에 근처 식당에 들러 보는 건 서울 근무자만의 호사다.' },
  /* ============================================================
     자료 조사 반영 이벤트 (나무위키·언론 보도 참고, README 참조)
     ============================================================ */

  /* ----- 일과·병영 ----- */
  { id: 'e_roll_am', r: [0, 3], w: 1.6, b: ['army', 'navy', 'marine', 'katusa'], title: '아침 점호', text: '기상 30분 뒤 아침 점호. 인원 보고, 복무신조 제창, 국군도수체조까지 이어진다. 오늘따라 당직사관의 눈이 매섭다.',
    choices: [
      { t: '구호를 크게 외친다', fx: { rep: 3, body: 1, mind: -1 }, text: '목소리가 맑게 울렸다. 당직사관이 말없이 고개를 끄덕인다.' },
      { t: '입만 벙긋한다', p: s => .55, win: { fx: { mind: 2 }, text: '아무도 눈치채지 못했다. 이 정도면 아침 체력 안배다.' }, lose: { fx: { rep: -4, mind: -1 }, text: '"방금 그쪽 목소리가 안 들렸다?" 단체로 한 번 더 외치게 됐다.' } },
    ] },
  { id: 'e_roll_pm', r: [0, 2], w: 1.4, auto: true, b: ['army', 'navy', 'marine', 'katusa'], title: '저녁 점호 전 대청소', text: '저녁 점호 전, 생활관 바닥을 닦고 관물대를 각 맞춘다. 당직사관이 문 앞에 서는 순간 모두가 숨을 죽인다.', fx: { body: -1, rep: 2, bond: 2 }, result: '인원 보고, 복무신조 제창, 취침 소등. 하루가 지나갔다는 사실만으로 위로가 된다.' },
  { id: 'e_duty', r: [2, 3], w: 1.8, b: ['army', 'navy', 'marine', 'af'], title: '당직 근무', scene: 'night', text: '오늘은 당직 근무. 밤새 상황을 접수하고 순찰을 돌고 나면 내일 일과는 쉬게 된다.',
    choices: [
      { t: '철저하게 순찰과 보고를 마친다', fx: { rep: 4, mind: -2, body: -2 }, text: '새벽 순찰까지 빠짐없이 돌았다. 아침 교대 때 간부가 "수고했다"며 음료수를 건넸다.' },
      { t: '쪽잠을 몰래 청한다', p: s => .5, win: { fx: { body: 2, mind: 2 }, text: '다행히 아무 일도 없이 밤이 지나갔다. 내일 일과 열외가 꿀맛이다.' }, lose: { fx: { rep: -5, mind: -3 }, text: '새벽 순찰 때 자리를 비운 걸 들켰다. 반성문과 함께 아침이 시작됐다.' } },
    ] },
  { id: 'e_ilkkeok', r: [1, 1], w: 100, need: s => s.month >= 6 && !s.flags.ilkkeok, flag: 'ilkkeok', auto: true, title: '일꺾', text: '일병 4개월 차. 복무 기간의 절반이 눈앞이다. 선임이 달력을 가리키며 말한다. "이제 일꺾이네."', fx: { mind: 5 }, result: '반을 넘겼다는 말이 이렇게 반가울 줄이야. 달력의 숫자가 오늘따라 선명하다.' },
  { id: 'e_sangkkeok', r: [2, 2], w: 100, need: s => s.month >= 12 && !s.flags.sangkkeok, flag: 'sangkkeok', auto: true, title: '상꺾', text: '"꺾인 상병"이 되면 말 한마디의 무게가 달라진다. 후임들의 눈이 나를 따라온다.', fx: { rep: 3, mind: 3 }, result: '실무는 내가 쥐고, 간부와 후임 사이를 오가는 중간관리자가 되었다. 책임이 조금 무겁다.' },
  { id: 'e_squad', r: [2, 3], w: 2.2, b: ['army', 'marine', 'katusa', 'sangun'], need: s => !s.flags.squad, flag: 'squad', title: '분대장 임명', text: '행정보급관이 부른다. "다음 달부터 네가 분대장 해라." 후임들의 얼굴과 간부의 기대가 한꺼번에 어깨 위로 얹힌다.',
    choices: [
      { t: '원칙대로 엄하게 이끈다', fx: { rep: 5, bond: -2, mind: -2 }, text: '규정대로 하니 분대가 단정해졌다. 다만 쉬는 시간에도 서로 조금 조심스럽다.' },
      { t: '형처럼 편하게 이끈다', fx: { bond: 6, rep: 1, mind: 1 }, text: '분대원들이 자연스럽게 따라온다. 점호도 작업도 의외로 순조롭다.' },
      { t: '간부에게 많이 기댄다', fx: { rep: 1, mind: -1 }, text: '결정을 미루다 보니 일이 느려졌다. 그래도 책임은 나눠졌다.' },
    ] },
  { id: 'e_exam', r: [1, 2], w: 2, b: ['army', 'marine', 'navy', 'af'], title: '병 진급 평가', text: '진급을 앞두고 개인기본훈련 평가가 잡혔다. 사격, 체력, 전투기술을 확인한다. 요즘은 "진급누락" 이야기가 병사들 사이에서 오르내린다. (제도가 바뀌는 중이라 부대마다 다릅니다.)',
    choices: [
      { t: '일과 후에 틈틈이 준비한다', p: s => .75 + s.stats.body / 600, win: { fx: { rep: 4, mind: 2 }, text: '평가는 무난히 통과! 계급장을 새로 달 날이 한결 마음 편하다.' }, lose: { fx: { rep: -4, mind: -4 }, text: '한 종목이 기준에 못 미쳤다. 재평가를 받고 가까스로 통과했지만 마음이 쓰리다.' } },
      { t: '벼락치기로 넘긴다', p: s => .45, win: { fx: { mind: 3 }, text: '운이 따랐다. 요령으로 한 번 넘어가는 순간도 있다.' }, lose: { fx: { rep: -6, mind: -5 }, set: { jinnu: true }, text: '결국 진급누락. 동기들은 계급장을 바꿔 다는데 나만 한 달 늦어진다.' } },
    ] },
  { id: 'e_phone_caught', r: [1, 3], w: 1.4, title: '휴대전화 사용 시간 단속', text: '휴대전화 시간은 일과 후 평일 저녁 6시부터 9시까지다. 그런데 지금은 시간 밖이다. 화장실에서 알림이 계속 울린다.',
    choices: [
      { t: '참고 시간이 될 때까지 기다린다', fx: { mind: -1, rep: 1 }, text: '시간이 되자마자 밀린 메시지에 한꺼번에 답했다. 기다림 뒤의 답장은 달다.' },
      { t: '화장실에서 잠깐 확인한다', p: s => .5, win: { fx: { mind: 3 }, text: '몰래 본 메시지가 가족의 안부였다. 다행히 아무도 몰랐다.' }, lose: { fx: { rep: -6, mind: -3, leave: -1 }, text: '당직사관에게 적발됐다. 휴대전화 사용 제한과 함께 외출·외박이 한동안 묶였다.' } },
    ] },
  { id: 'e_outing', r: [1, 3], w: 2, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '평일 일과 후 외출', text: '일과가 끝나고 외출증을 받았다. 복귀 시간까지 몇 시간뿐이지만 정문 밖 공기가 다르다.',
    choices: [
      { t: '치킨과 햄버거로 배를 채운다', fx: { mind: 6, body: 1, money: -4 }, text: '"사회 음식은 이렇게 맛있구나." 포장해 오지 못한 게 아쉽다.' },
      { t: '카페에서 책을 읽으며 조용히 쉰다', fx: { mind: 5, skill: 2, money: -2 }, text: '창가 자리에서 한 시간. 군대 밖의 시간은 속도가 다르다.' },
      { t: '복귀 시간에 쫓겨 뛰어온다', p: s => .6, win: { fx: { mind: 4, body: -1 }, text: '아슬아슬하게 정문을 통과했다. 가슴이 두근거렸지만 즐거웠다.' }, lose: { fx: { rep: -5, mind: -2 }, text: '복귀가 몇 분 늦었다. 반성문과 함께 외출이 한동안 묶였다.' } },
    ] },
  { id: 'e_goldcart', r: [0, 3], w: 2.6, auto: true, tags: ['gop', 'island'], title: '황금마차', text: '격오지 부대에 일주일에 한 번 찾아오는 이동식 PX, 황금마차가 도착했다. 멀리서 차 소리가 들리자 소초 전체가 들썩인다.', fx: { mind: 6, money: -4 }, result: '라면, 과자, 냉동만두. 장바구니가 가득 찼다. 이날만큼은 모두의 표정이 풀렸다.' },
  { id: 'e_sajibang', r: [0, 3], w: 1.8, auto: true, tags: ['gop', 'island'], title: '사지방 한 시간', text: '휴대전화가 보급된 뒤 사지방은 한산해졌지만, 통신이 잘 안 되는 격오지에서는 여전히 인기 시설이다.', fx: { mind: 4, skill: 1 }, result: '느린 컴퓨터 앞에서 부모님께 메일을 썼다. 사지방 특유의 키보드 소리가 정겹다.' },
  { id: 'g_water', r: [1, 3], w: 1.6, auto: true, season: 'winter', tags: ['gop'], title: '수도가 얼었다', scene: 'snow', text: '한파에 계곡물을 끌어 쓰던 급수관이 얼어붙었다. 씻는 것도, 취사도 물을 길어 와야 한다.', fx: { body: -3, bond: 3, mind: -2 }, result: '양동이를 줄지어 나르며 서로 농담을 건넸다. 물 한 바가지의 소중함이 몸에 스며든다.' },
  { id: 'g_alarm', r: [0, 3], w: 2, auto: true, tags: ['gop'], title: '철책 경보 출동', scene: 'night', text: '새벽 3시 철책 경보가 울린다. 소초 전원이 완전군장으로 튀어나간다. 알고 보니 고라니 한 마리가 철책에 부딪힌 것이었다.', fx: { body: -2, mind: -1, bond: 3 }, result: '허탈하게 웃으며 복귀했다. "그래도 아무 일 없어서 다행이다." 누군가 중얼거렸다.' },

  /* ----- 훈련·작업 ----- */
  { id: 'e_yugyeok', r: [1, 3], w: 2.2, season: 'summer', b: ['army', 'marine'], tags: ['combat', 'special', 'arty', 'armor', 'eng', 'rear'], title: '유격 훈련', scene: 'march', text: '4박 5일 유격 훈련. 첫날 20km 입소 행군을 하고, PT체조부터 장애물, 참호격투, 레펠까지 이어진다. 마지막 날엔 복귀 행군이 새벽까지 이어진다.',
    choices: [
      { t: 'PT체조를 구호에 맞춰 끝까지 해낸다', fx: { body: -5, rep: 5, mind: -1 }, text: '"유격!" 구호를 외치며 마지막까지 버텼다. 조교가 "너 정말 열심히 한다"며 웃었다.' },
      { t: '체력을 안배하며 요령 있게 한다', fx: { body: -3, rep: 1, mind: 1 }, text: '요령은 곧 생존 전략이다. 마지막 날까지 쓰러지지 않고 살아남았다.' },
      { t: '참호격투에서 앞장선다', p: s => .5, win: { fx: { rep: 6, bond: 4, body: -4 }, text: '흙탕물 속에서 우리 팀이 깃발을 지켜냈다. 서로 얼굴을 보며 한참 웃었다.', hl: '유격 훈련 참호격투에서 팀을 이끌어 승리함' }, lose: { fx: { mind: -2, body: -3, bond: 3 }, text: '흙탕물에 얼굴을 파묻었다. 그래도 다 같이 진흙투성이라 오히려 친해졌다.' } },
    ] },
  { id: 'e_mow', r: [1, 3], w: 2, season: 'summer', b: ['army', 'marine', 'navy', 'af', 'katusa'], tags: ['combat', 'rear', 'base', 'work', 'air'], title: '예초 작업', text: '여름의 부대는 풀과의 전쟁이다. 예초기를 멘 병사가 손이 떨릴 정도로 하루 종일 풀을 깎는다.',
    choices: [
      { t: '예초기를 맡는다', fx: { body: -5, rep: 4 }, text: '풀이 쓰러질 때마다 마음도 시원해졌다. 뱀 한 마리가 튀어나와 모두가 소리를 질렀다.' },
      { t: '갈퀴로 풀을 모은다', fx: { body: -2, bond: 2 }, text: '풀 더미를 쌓다 보니 어느새 땀범벅이다. 간부가 아이스크림을 돌렸다.' },
      { t: '그늘을 찾아 틈틈이 쉰다', p: s => .5, win: { fx: { mind: 2 }, text: '무사히 쉬엄쉬엄 마쳤다. 요령은 곧 체력이다.' }, lose: { fx: { rep: -3 }, text: '행보관에게 들켰다. 곧바로 예초기를 넘겨받았다.' } },
    ] },
  { id: 'e_aid', r: [1, 3], w: 1.8, b: ['army', 'marine', 'navy', 'af'], tags: ['combat', 'rear', 'work', 'base'], title: '대민지원', text: '인근 마을의 농번기 일손을 돕는 대민지원 날. 군복 차림의 병사들이 줄지어 밭으로 향한다.',
    choices: [
      { t: '팔 걷고 열심히 돕는다', fx: { body: -4, rep: 5, mind: 2 }, text: '주민분들이 막걸리와 수박을 내오셨다. "우리 군인 아저씨들 최고!"' },
      { t: '요령껏 쉬엄쉬엄 한다', fx: { body: -2, rep: -2, mind: 1 }, text: '어르신이 끌끌 혀를 차며 새참을 내오셨다. 괜히 민망해졌다.' },
    ] },
  { id: 'e_cal', r: [3, 3], w: 2.4, auto: true, title: '달력에 줄 긋기', text: '말년의 하루는 달력 한 칸을 지우는 것으로 시작한다. 전역일에는 동그라미, 남은 날에는 하나씩 가위표를 친다.', fx: { mind: 3 }, result: '"D-60, 이제 두 달 남았네." 숫자가 줄어드는 소리가 들리는 것 같다.' },
  { id: 'e_leaf', r: [3, 3], w: 2.2, title: '떨어지는 낙엽도 조심', text: '말년병장은 낙엽도 조심해야 한다는 농담이 있다. 전역을 앞두고 사고라도 나면 모든 게 늦어질 수 있다.',
    choices: [
      { t: '무리하지 않고 안전하게 지낸다', fx: { mind: 3, rep: 2 }, text: '조용히 하루하루를 마무리했다. 지루한 하루가 가장 값진 하루다.' },
      { t: '체육 시간에 방심하고 뛴다', p: s => .6, win: { fx: { body: 2, mind: 2 }, text: '운동 후 상쾌한 기분. 다행히 몸에는 이상이 없다.' }, lose: { fx: { body: -3, mind: -3 }, text: '발목을 삐끗했다. 의무대 진료를 받으며 전역일이 걱정됐다. 다행히 곧 나았다.' } },
    ] },
  { id: 'e_mark', r: [3, 3], w: 1.6, auto: true, title: '예비군 마크', text: '말년휴가 전후로 예비군 마크를 달 시기가 된다. 너무 일찍 달면 핀잔을 듣고, 너무 늦으면 허전하다.', fx: { mind: 3, bond: 2 }, result: '후임이 "벌써요?" 하고 웃는다. 어깨의 작은 마크 하나가 전역의 현실감을 더한다.' },

  /* ----- 보직별 ----- */
  { id: 'x_arty_wait', r: [0, 3], w: 2, auto: true, tags: ['arty'], title: '자주포 안에서의 대기', scene: 'camp', text: '사격 훈련 날, 자주포 안에서 기다리는 시간이 길다. 한참을 앉아 있다 보면 졸음과 지루함이 가장 큰 적이다.', fx: { mind: -2, body: -1, skill: 1 }, result: '"포 사격 시작!" 구령이 떨어지는 순간 졸음이 싹 사라졌다. 쾅 소리에 귀가 한참 윙윙거린다.' },
  { id: 'x_arty_ruck', r: [1, 3], w: 1.8, auto: true, tags: ['arty'], title: '포병 행군', scene: 'march', text: '포병은 보병보다 군장이 무겁다는 말이 사실인지 확인하는 날. 포 장비까지 챙기고 한참을 걷는다.', fx: { body: -5, rep: 3, mind: -2 }, result: '어깨 끈이 파고든다. 마지막 휴식 때 옆자리 동기가 건넨 사탕 하나가 눈물 나게 달다.' },
  { id: 'x_tank_maint', r: [0, 3], w: 2, auto: true, tags: ['armor'], title: '전차 정비의 날', text: '전차는 멋있지만 정비는 끝이 없다. 궤도 점검과 기름때 청소로 하루가 간다.', fx: { body: -2, skill: 2, rep: 2 }, result: '손톱 밑이 까맣게 됐지만, 시동 소리가 규칙적으로 울릴 때의 쾌감이 있다.' },
  { id: 'x_eng_work', r: [0, 3], w: 2, auto: true, tags: ['eng'], title: '도로 공사 작업', text: '공병대는 훈련보다 공사가 일이다. 오늘은 부대 진입로 보수와 배수로 정비에 투입됐다.', fx: { body: -4, skill: 3, rep: 2 }, result: '삽질과 장비 조작이 손에 익었다. 전역 후 어디서든 써먹을 기술이 하나 늘었다.' },
  { id: 'x_recon_gp', r: [1, 3], w: 1.6, auto: true, tags: ['special'], b: ['army'], title: 'GP 투입', scene: 'gop', text: 'GP에 투입되면 전 장병이 출타와 휴대전화를 쓸 수 없다. 대신 지원자들만 모인 팀이라 분위기는 끈끈하다.', fx: { body: -3, bond: 5, mind: -2, rep: 3 }, result: '몸은 고단하지만 서로 눈치 볼 일이 없는 팀이다. 헬멧을 맞대고 웃는 시간이 의외로 많다.' },
  { id: 'x_sun', r: [0, 3], w: 2.4, tags: ['driver'], title: '선탑 간부', scene: 'camp', text: '오늘 운행의 선탑 간부는 처음 보는 얼굴이다. 차량에 오르기 전까지 성격을 알 수 없어 긴장된다.',
    choices: [
      { t: '조용히 안전 운전에 집중한다', fx: { rep: 3, mind: -1 }, text: '"운전 참 부드럽게 한다." 한마디에 마음이 놓였다. 덕분에 휴게소 음료수까지 얻어 마셨다.' },
      { t: '말을 붙이며 분위기를 푼다', p: s => .5, win: { fx: { bond: 4, mind: 2 }, text: '의외로 이야기가 잘 통했다. 돌아오는 길에는 라디오 볼륨까지 맞춰 주셨다.' }, lose: { fx: { rep: -2, mind: -2 }, text: '"운전에 집중하자."라는 차가운 한마디로 이후 한 시간이 조용했다.' } },
    ] },
  { id: 'x_tetris', r: [0, 3], w: 2, auto: true, tags: ['driver', 'supply'], title: '부식차 테트리스', text: '부식차에 짐을 싣는 작업은 일종의 테트리스다. 상자를 이리저리 돌려 가며 빈틈없이 쌓아야 문이 닫힌다.', fx: { body: -2, skill: 1, rep: 2 }, result: '마지막 상자까지 딱 맞춰 넣자 모두가 박수를 쳤다. 이런 걸 군대에서 배울 줄이야.' },
  { id: 'x_snow_road', r: [1, 3], w: 1.8, season: 'winter', tags: ['driver'], title: '눈길 운행', scene: 'snow', text: '산간 소초로 부식을 나르는 날, 눈이 내려 길이 빙판이다. 체인을 감고 천천히 올라가야 한다.',
    choices: [
      { t: '무리하지 않고 체인을 감고 올라간다', fx: { rep: 4, body: -2 }, text: '한 시간 더 걸렸지만 무사히 도착했다. 소초 병사들이 박수로 맞아 줬다.' },
      { t: '일정을 맞추려 속도를 낸다', p: s => .4, win: { fx: { rep: 3 }, text: '다행히 별일 없이 도착했다. 가슴은 내내 쿵쿵 뛰었다.' }, lose: { fx: { rep: -5, mind: -3 }, text: '길가 배수로에 바퀴가 빠졌다. 구난차가 올 때까지 눈 속에서 기다렸다. 반성문은 덤이다.' } },
    ] },
  { id: 'x_dawn', r: [0, 3], w: 2.4, auto: true, tags: ['cook'], title: '새벽 4시 반', scene: 'night', text: '기상 나팔보다 먼저 일어나는 사람들, 조리병이다. 아직 어두운 취사장에서 쌀을 씻고 국솥에 불을 넣는다.', fx: { body: -3, mind: -2, rep: 2, leave: 1 }, result: '밥 냄새가 퍼질 즈음 해가 뜬다. 분기마다 나오는 위로휴가가 이 일의 보상이다.' },
  { id: 'x_hot_kitchen', r: [1, 3], w: 2, season: 'summer', tags: ['cook'], title: '40도 조리실', text: '한여름 조리실은 사우나다. 식중독 예방 기간이라 청소와 점검도 평소의 두 배다.',
    choices: [
      { t: '점검표를 꼼꼼히 채우고 청소한다', fx: { body: -4, rep: 5, mind: -2 }, text: '위생 점검에서 지적 사항 0건. 간부가 "이번에도 무사히 넘겼다"며 시원한 음료를 사 줬다.' },
      { t: '급한 것만 대충 정리한다', p: s => .4, win: { fx: { body: -1, mind: 1 }, text: '운 좋게 점검을 통과했다. 하지만 가슴이 내내 두근거렸다.' }, lose: { fx: { rep: -5, mind: -3 }, text: '위생 점검에서 지적을 받았다. 전원 재청소를 마치고 나니 밤이었다.' } },
    ] },
  { id: 'x_burger_day', r: [0, 3], w: 1.2, auto: true, tags: ['cook'], title: '군대리아 날', text: '군대리아는 기성품을 데우기만 하면 되어 조리병이 은근히 반기는 메뉴다. 설거지도 줄어든다.', fx: { mind: 3, body: 1 }, result: '"오늘 점심은 일찍 끝나겠다." 조리병들의 표정이 한결 가볍다.' },
  { id: 'x_fake', r: [0, 3], w: 2, tags: ['medic'], title: '꾀병 구분', text: '배가 아프다며 오는 병사가 한 달에 열 번째다. 진짜 아픈 건지, 쉬고 싶은 건지 헷갈린다.',
    choices: [
      { t: '문진을 꼼꼼히 하고 간부에게 보고한다', fx: { skill: 3, rep: 3 }, text: '얘기를 오래 들어 보니 다른 고민이 있었다. 상담관 면담까지 연결해 줬다.', hl: '아픈 병사의 속사정을 알아채고 상담까지 연결해 줌' },
      { t: '증상만 보고 약을 처방한다', fx: { rep: -1, mind: -1 }, text: '규정대로 처리했지만 뒷맛이 개운치 않다.' },
    ] },
  { id: 'x_medic_pull', r: [0, 3], w: 1.6, auto: true, tags: ['medic'], title: '의무대에서 작업 차출', text: '진료가 한가한 틈에 작업병으로 차출됐다. 청진기를 놓고 삽을 든다.', fx: { body: -3, bond: 2, mind: -1 }, result: '"의무병도 병사야." 행보관의 말에 할 말이 없다. 오후엔 다시 진료실로 돌아왔다.' },
  { id: 'x_horn_winter', r: [0, 3], w: 1.6, season: 'winter', tags: ['band'], title: '악기가 얼었다', text: '한겨울 야외 공연. 악기는 얼음처럼 차갑고 입술은 마우스피스에 붙을 지경이다.',
    choices: [
      { t: '입김으로 악기를 덥히며 끝까지 연주한다', fx: { body: -2, rep: 5, mind: -1 }, text: '마지막 곡까지 틀리지 않고 마쳤다. 박수 소리가 어떤 핫팩보다 따뜻했다.' },
      { t: '핫팩을 몰래 악기 케이스에 넣어 둔다', fx: { body: -1, rep: 1, mind: 1 }, text: '요령껏 버텼다. 음정이 조금 흔들렸지만 무사히 끝났다.' },
    ] },
  { id: 'x_voice', r: [0, 3], w: 1.8, auto: true, tags: ['trainer'], title: '목이 쉬었다', text: '하루 종일 구령을 외치다 보니 목소리가 갈라졌다. 훈련병들 앞에서는 엄격해야 하지만 속으로는 미안한 마음이 든다.', fx: { body: -1, mind: -2, rep: 2, leave: 1 }, result: '퇴소하는 훈련병이 건넨 "감사했습니다!" 한마디에 쉰 목소리도 괜찮아졌다.' },
  { id: 'o_stereo', r: [1, 3], w: 1.8, tags: ['office'], b: ['army', 'marine', 'navy', 'af'], title: '행정병은 편하다고?', text: '전투 보직 병사가 "행정병은 맨날 앉아 있어서 좋겠다"고 한마디한다. 방금 막 공문 열 건을 처리한 참이다.',
    choices: [
      { t: '웃으며 맞받아친다', fx: { bond: 3, mind: 1 }, text: '"이 표 한 번 같이 만들어 볼래?" 한바탕 웃음이 터졌다. 편견은 농담으로 눌렀다.' },
      { t: '말없이 넘긴다', fx: { mind: -2 }, text: '말해 봤자 입만 아프다. 대신 그날 밤 서류를 한 장 더 처리했다.' },
    ] },
  { id: 'o_dual', r: [1, 3], w: 1.8, auto: true, tags: ['office'], b: ['army', 'marine'], title: '이중 소속', text: '처부장의 보고서와 행보관의 작업 요청이 동시에 떨어졌다. 어느 쪽을 먼저 해도 다른 쪽이 불만이다.', fx: { mind: -3, rep: 2, skill: 2 }, result: '우선순위를 메모로 정리해 양쪽에 공유했다. 그제야 두 사람이 서로 일정을 조율해 주었다.' },
  { id: 'o_leave_docs', r: [1, 3], w: 1.6, auto: true, tags: ['office'], title: '남의 휴가 서류', text: '휴가 신청서를 처리하다 보니 내 휴가 일정만 자꾸 밀린다. 업무를 아는 사람이 나뿐이라서다.', fx: { mind: -2, skill: 2, rep: 3 }, result: '인수인계 문서를 만들어 두었다. 다음 달엔 마음 편히 나갈 수 있을 것 같다.' },

  /* ----- 군종별 ----- */
  { id: 'n_anchor', r: [1, 2], w: 2, tags: ['ship'], b: ['navy'], need: s => !s.flags.anchor, flag: 'anchor', title: '앵카를 서약하겠나?', scene: 'ship', text: '함정 근무 몇 달째. 간부가 슬쩍 제안한다. "계속 승선하기로 서약하면 휴가를 더 챙겨 줄게. 대신 육상 전출은 어렵다."',
    choices: [
      { t: '서약하고 함정에 남는다', fx: { leave: 4, mind: -2, rep: 3 }, text: '휴가 4일이 쌓였다. 바닷바람에는 이미 익숙해졌다.' },
      { t: '육상 전출을 신청한다', p: s => .5, win: { fx: { mind: 4, rep: -1 }, text: '전출이 승인됐다. 파도 대신 땅이 단단하게 발에 닿는 기분이다.' }, lose: { fx: { mind: -2 }, text: '"이번에는 어렵다"는 답이 돌아왔다. 한 번 더 도전해 보기로 한다.' } },
    ] },
  { id: 'n_15min', r: [0, 3], w: 1.8, auto: true, b: ['navy'], title: '15분 전의 문화', scene: 'ship', text: '해군의 불문율, "15분 전 준비". 집합 15분 전에 이미 모든 준비를 끝내고 서 있어야 한다.', fx: { rep: 3, mind: -1 }, result: '처음엔 억울했지만 이제는 시간에 쫓기지 않는다는 걸 안다. 몸에 밴 습관이 하나 늘었다.' },
  { id: 'n_allow', r: [1, 3], w: 1.4, auto: true, tags: ['ship'], b: ['navy'], title: '함정 수당', scene: 'ship', text: '출동이 끝나고 받은 월급 명세서에 처음 보는 항목이 붙었다. 함정 수당이다.', fx: { money: 10, mind: 3 }, result: '통장 숫자가 평소보다 조금 더 올랐다. 파도의 대가가 이런 거라면 괜찮은 거래다.' },
  { id: 'f_study', r: [0, 3], w: 2, b: ['af'], title: '독서실 책상', text: '공군 생활관에는 독서실 책상이 있고, 평일 연등을 허락하는 부대도 많다. 퇴근 후 시간을 어떻게 쓸까?',
    choices: [
      { t: '자격증 공부에 쓴다', fx: { skill: 8, mind: -1, body: -1 }, text: '한 달 만에 문제집 한 권을 끝냈다. 전역 후 이력서에 한 줄이 늘 것이다.' },
      { t: '운동과 휴식으로 푹 쉰다', fx: { body: 3, mind: 4 }, text: '체력단련실에서 땀 흘리고 샤워까지. 일과제 부대의 여유를 만끽했다.' },
    ] },
  { id: 'f_ext', r: [0, 3], w: 1.8, auto: true, b: ['af'], title: '6주마다의 정기외박', text: '6주에 한 번 나오는 정기외박. 부대 정문을 나서는 순간 공기가 달라진다.', fx: { mind: 6, money: -3 }, result: '"휴가 또 나왔니?" 육군 친구의 농담이 이날만큼은 기분 좋다.' },
  { id: 'f_runway_snow', r: [1, 3], w: 2, auto: true, season: 'winter', tags: ['air'], b: ['af'], title: '활주로 제설', scene: 'snow', text: '눈이 오면 활주로와 유도로를 먼저 치워야 항공기가 이륙한다. 새벽부터 제설차와 함께 투입된다.', fx: { body: -4, rep: 3, bond: 2 }, result: '활주로 위로 전투기가 힘차게 이륙했다. 내가 치운 길이다 싶어 괜히 뿌듯했다.' },
  { id: 'f_points', r: [1, 3], w: 1.6, auto: true, b: ['af'], title: '가점이 쌓였다', text: '야근과 행사 지원이 쌓여 포상 가점이 목표치를 넘었다. 간부가 "휴가로 바꿔 줄게"라고 말한다.', fx: { leave: 2, mind: 5 }, result: '가점으로 얻은 포상휴가 2일. 달력을 보며 신나게 계획을 세운다.' },
  { id: 'm_gisu', r: [1, 3], w: 1.6, auto: true, b: ['marine'], title: '기수 문화', text: '해병대는 기수가 곧 신분증이다. 훈련소 수료 기수를 외우고, 선후배 기수를 서로 챙기는 문화가 강하다.', fx: { bond: 4, rep: 2, mind: 1 }, result: '"몇 기냐?"라는 질문 한마디로 처음 만난 사람과도 금세 가까워진다.' },
  { id: 'k_pass', r: [1, 3], w: 2, tags: ['us'], b: ['katusa'], title: '패스폼 외박', scene: 'katusa', text: '미군이 발급하는 외박증, 패스폼을 받았다. 주말 동안 기지 밖으로 나갈 수 있다.',
    choices: [
      { t: '서울에서 친구들과 논다', fx: { mind: 8, money: -8 }, text: '금요일 저녁 정문을 나서는 순간 모든 피로가 날아갔다.' },
      { t: '기지 밖 숙소에서 쉬며 영어 공부한다', fx: { skill: 4, mind: 3, body: 2 }, text: '조용한 주말. 미군 친구가 추천해 준 영어 드라마를 정주행했다.' },
    ] },
  { id: 'k_shika', r: [1, 3], w: 1.6, auto: true, tags: ['us'], b: ['katusa'], title: '시카(Senior KATUSA)', scene: 'katusa', text: '시카 병장은 한국군과 미군 사이의 가교다. 규정과 요청을 어느 쪽도 상하지 않게 전달하는 역할이다.', fx: { skill: 3, rep: 3, mind: -1 }, result: '"원복"이라는 단어가 괜히 무섭게 들린다. 한미 양쪽 규정을 지키는 감각이 몸에 배었다.' },
  { id: 'k_hours', r: [0, 3], w: 1.8, auto: true, tags: ['us'], b: ['katusa'], title: '오후 5시 퇴근', scene: 'katusa', text: '미군 부대의 일과는 대체로 오전 9시에서 오후 5시. 불침번도, 위병소 근무도 거의 없다.', fx: { mind: 4, body: 1 }, result: '일과 후 체력단련장에서 땀을 흘리며 육군 동기에게 이 얘기를 하면 믿지 못할 것 같다.' },
  { id: 's_bus', r: [0, 3], w: 2, auto: true, b: ['sangun'], title: '군복 입고 출근하는 버스', scene: 'town', text: '군복을 입고 시내버스에 타면 시선이 느껴진다. 두발과 복장도 신경 써야 한다.', fx: { mind: -1, rep: 2 }, result: '자리를 양보하려다 도리어 어르신께 "고생이 많다"는 말과 사탕을 받았다.' },
  { id: 's_docs', r: [0, 3], w: 2, auto: true, tags: ['office'], b: ['sangun'], title: '예비군 서류 정리', scene: 'town', text: '예비군 훈련 통지서와 편성 서류를 정리하는 날. 수천 장의 서류가 이름순으로 쌓인다.', fx: { skill: 2, rep: 2, mind: -1 }, result: '서류 사이에서 아는 동네 아저씨 이름을 찾아내 웃음이 났다.' },
  { id: 'c_reassign', r: [1, 3], w: 2, tags: ['care'], b: ['civil'], need: s => !s.flags.reassign, flag: 'reassign', title: '재지정 신청', scene: 'town', text: '복지시설 근무가 몇 달째 이어지며 몸과 마음이 지쳐 간다. 선임 복무자가 말한다. "견디기 힘들면 재지정 신청도 방법이야."',
    choices: [
      { t: '재지정을 신청한다', p: s => .5, win: { fx: { mind: 8, body: 3, rep: -1 }, text: '새 근무지는 사무실이었다. 한결 숨이 트인다.' }, lose: { fx: { mind: -3 }, text: '심사 결과는 기각. 그래도 담당자가 근무 환경을 조금 개선해 주었다.' } },
      { t: '조금 더 버텨 본다', fx: { mind: -2, bond: 3, rep: 3 }, text: '이용자분들과 정이 들었다. 힘든 만큼 얻는 것도 분명 있다.' },
      { t: '복무 담당자와 먼저 상담한다', fx: { mind: 4, rep: 1 }, text: '고민을 털어놓으니 근무 시간 조정과 휴식 보장을 약속받았다.' },
    ] },
  { id: 'c_sat', r: [0, 3], w: 1.8, auto: true, tags: ['station'], b: ['civil'], title: '토요일 근무', scene: 'town', text: '지하철 역사에서는 교대 근무가 일상이고, 토요일 출근을 요구받기도 한다. 달력의 빨간 날이 남 얘기 같다.', fx: { mind: -3, body: -1, money: 2 }, result: '다음 주 연가로 쉬는 날을 챙겼다. 쉼표는 스스로 만들어야 한다.' },
  { id: 'c_vac', r: [0, 3], w: 1.8, auto: true, tags: ['commute'], b: ['civil'], need: s => s.unitId === 'c_school', title: '방학이다', scene: 'town', text: '학교에 방학이 시작됐다. 학생도 교사도 줄어들자 해야 할 일이 거의 없다.', fx: { mind: 6, skill: 4, body: 1 }, result: '빈 교실에서 자격증 공부를 하며 시간을 보낸다. 이게 학교 복무의 숨은 매력이다.' },
  { id: 'c_fire119', r: [0, 3], w: 2, tags: ['fire119'], b: ['civil'], title: '출동 사이렌', scene: 'town', text: '소방서 사이렌이 울린다. 센터 전체가 순식간에 움직이고, 복무요원인 나는 현장 지원과 물품 정리를 맡는다.',
    choices: [
      { t: '침착하게 지시대로 움직인다', fx: { rep: 5, mind: -2 }, text: '현장이 정리된 뒤 팀장이 "오늘 도움 많이 됐다"며 어깨를 두드렸다.' },
      { t: '긴장해서 물품 정리를 놓친다', fx: { rep: -2, mind: -2 }, text: '다음부터는 체크리스트를 따로 만들어 두기로 했다.' },
    ] },
  { id: 'c_gu', r: [0, 3], w: 2, tags: ['gu'], b: ['civil'], title: '부서 로또', scene: 'town', text: '구청은 부서마다 일이 다르다. 회식 자리에서 선임이 말한다. "행정 쪽은 편하고, 청소·도로 쪽은 힘들지."',
    choices: [
      { t: '업무를 열심히 배운다', fx: { skill: 4, rep: 3, mind: -1 }, text: '주무관님이 업무 매뉴얼을 직접 알려 주셨다. 전역 후 실무 감각이 늘었다.' },
      { t: '최대한 편한 업무만 찾는다', fx: { mind: 3, rep: -1 }, text: '몸은 편하지만 시간이 천천히 흐르는 느낌이다.' },
    ] },

  /* ============================================================
     폐급 후임 · 내 사고 · 징계 · 의가사 · 황당한 실제 상황
     inc: 사고 누적(징계로 이어짐), endEarly: 조기 전역 엔딩
     ============================================================ */

  /* ----- 후임이 말썽 (첫 후임 이후) ----- */
  { id: 'j_rifle', r: [2, 3], w: 2.4, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '폐급 후임의 소총 분해조립', text: '후임이 총기 수입 시간에 노리쇠를 거꾸로 끼웠다. 벌써 세 번째다. 일과가 끝나기 전에 검열이 오는데 후임의 총은 아직 반쯤 분해된 상태다.',
    choices: [
      { t: '처음부터 같이 천천히 다시 해 본다', fx: { bond: 5, rep: 1, body: -1 }, text: '"아, 이제 알겠습니다!" 한 번 이해하고 나니 후임의 손이 달라졌다. 검열 직전에 가까스로 맞췄다.' },
      { t: '내가 대신 조립해 준다', fx: { rep: -1, bond: 2, mind: -1 }, text: '시간은 아꼈지만 후임은 여전히 모른다. 내일도 같은 일이 벌어질 것 같은 예감이 든다.' },
      { t: '행보관에게 보고한다', fx: { rep: 1, bond: -3 }, text: '행보관이 직접 보충 교육을 시켜 줬다. 후임은 한동안 나를 슬쩍 피한다.' },
    ] },
  { id: 'j_cheer', r: [2, 3], w: 1.6, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '엉뚱한 구호', text: '점호 시간, 후임이 정해진 구호 대신 어제 본 예능 유행어를 우렁차게 외쳤다. 당직사관의 표정 관리가 실패했다.', fx: { bond: 3, mind: 2, rep: -1 }, result: '당직사관이 한참 눈을 감았다. 하지만 그날 점호는 유난히 오래 기억에 남았다.' },
  { id: 'j_blame', r: [2, 3], w: 2.2, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '연대 책임', text: '후임이 청소 구역 점검에서 지적을 받았다. 간부가 "분대장도 책임진다"고 한다. 단체로 외출이 한 번 묶일 위기다.',
    choices: [
      { t: '내가 책임지고 사과한다', fx: { rep: 3, bond: 5, mind: -2 }, text: '"후임이 실수한 건 선임이 못 가르친 탓입니다." 간부가 잠깐 침묵하다 이번만 넘어가 주었다.' },
      { t: '후임에게 책임을 넘긴다', fx: { rep: -2, bond: -6 }, text: '그 자리에서는 모면했지만, 이후 생활관 분위기가 며칠간 서늘했다.' },
      { t: '같이 청소하며 해결한다', fx: { body: -2, bond: 4, rep: 2 }, text: '둘이 밤늦게까지 걸레질을 하며 이야기를 나눴다. 의외로 그 후임, 착한 구석이 있었다.' },
    ] },
  { id: 'j_phone_cover', r: [2, 3], w: 1.8, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '후임의 몰래 휴대전화', text: '후임이 시간 외에 몰래 휴대전화를 쓰는 모습이 내 눈에 띄었다. 걸리면 후임뿐 아니라 사수인 나도 곤란해진다.',
    choices: [
      { t: '조용히 불러 주의를 준다', fx: { bond: 2, rep: 2 }, text: '"한 번만 더 보이면 그땐 보고한다." 후임이 굳은 얼굴로 고개를 끄덕였다.' },
      { t: '모른 척한다', p: s => .5,
        win: { fx: { mind: 1 }, text: '다행히 아무 일도 없었다. 하지만 다음 주에 또 같은 장면을 보게 된다.' },
        lose: { fx: { rep: -4, mind: -2 }, inc: 1, text: '당직사관에게 적발됐고, 사수라는 이유로 나까지 불려갔다. 반성문 두 장.' } },
      { t: '간부에게 보고한다', fx: { rep: 2, bond: -4 }, text: '규정대로 처리했다. 후임은 한동안 나와 눈을 마주치지 않았다.' },
    ] },
  { id: 'j_lost_tag', r: [1, 3], w: 1.8, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '사라진 군번줄', text: '후임이 군번줄을 어디서 잃어버렸는지 모른다. 곧 휴가 나가는 날인데 군번줄이 없으면 부대 밖으로 나갈 수 없다.',
    choices: [
      { t: '같이 생활관과 세탁장을 뒤진다', p: s => .7,
        win: { fx: { bond: 4 }, text: '세탁장 배수구 근처에서 발견! 후임이 거의 울 뻔했다.' },
        lose: { fx: { bond: 1, mind: -1 }, text: '결국 행정반에서 재발급 절차를 밟았다. 후임의 휴가가 하루 미뤄졌지만 그 하루 동안 아주 반성한 얼굴이었다.' } },
      { t: '"알아서 찾아봐"라고 한다', fx: { bond: -3, rep: -1 }, text: '후임은 혼자 한참 헤맸다. 찾긴 찾았지만, 서로 서먹해졌다.' },
    ] },
  { id: 'j_mom', r: [2, 3], w: 1.4, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, title: '후임 어머니의 전화', text: '행정반 전화가 울린다. 후임의 어머니라고 한다. "우리 애가 밥은 잘 먹나요?" 간부가 수화기를 내 쪽으로 건네며 눈짓한다.',
    choices: [
      { t: '정성껏 안심시켜 드린다', fx: { rep: 3, bond: 3 }, text: '"밥 많이 먹고 건강히 지냅니다. 걱정 마십시오." 어머니의 목소리가 떨렸다. 후임은 나중에 몰래 고맙다고 했다.' },
      { t: '간부에게 넘긴다', fx: { rep: -1 }, text: '행보관이 대신 통화했다. 말없이 전화를 끊고 한숨 쉬는 모습이 어쩐지 남의 일 같지 않았다.' },
    ] },
  { id: 'j_ace', r: [3, 3], w: 2, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.flags.junior, hl: '"폐급"이던 후임이 어느새 에이스가 되어 있었음', title: '그 후임이 달라졌다', text: '그렇게 헤매던 후임이 어느새 사격에서 특등사수를 땄다. 다른 선임이 어깨를 으쓱한다. "누가 키웠냐, 내가 키웠지."', fx: { bond: 6, mind: 4, rep: 2 }, result: '시간이 사람을 바꾼다. 내가 입대 직후 헤매던 모습도 누군가의 기억 속에서 지금쯤 웃음거리일 것이다.' },

  /* ----- 내 사고 (폐급짓) ----- */
  { id: 'm_late', r: [1, 3], w: 2, b: ['army', 'navy', 'af', 'marine', 'katusa'], need: s => s.lastLeaveWeek >= 0, title: '복귀 시간을 놓쳤다', text: '휴가 마지막 날, 기차가 연착됐다. 복귀 시각은 저녁 점호 전까지인데 부대까지 아직 한참 남았다.',
    choices: [
      { t: '즉시 부대에 전화로 사정을 보고한다', fx: { rep: 1, mind: -2 }, text: '당직사관이 "조심히 오라"고 했다. 가까스로 늦지 않게 도착했다. 정직이 최선이었다.' },
      { t: '보고 없이 택시를 타고 최대한 달린다', p: s => .5,
        win: { fx: { mind: -1, money: -4 }, text: '아슬아슬하게 정문을 통과했다. 등에 식은땀이 흘렀다.' },
        lose: { fx: { rep: -8, mind: -4, leave: -2 }, inc: 1, text: '정문을 몇 분 늦게 통과했다. 이유를 설명하지 않은 탓에 반성문과 휴가 제한까지 받았다.' } },
    ] },
  { id: 'm_oversleep', r: [0, 3], w: 1.4, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '기상 나팔을 못 들었다', text: 'TV연등 다음 날, 기상 시간을 놓치고 눈을 떴을 땐 이미 점호 대열이 밖에 서 있었다.', fx: { rep: -3, mind: -2 }, result: '허둥지둥 뛰어나가 대열 끝에 섰다. 당직사관의 눈빛이 말한다. "내일은 없다."' },
  { id: 'm_ammo', r: [1, 3], w: 1.4, b: ['army', 'marine', 'katusa'], tags: ['combat', 'rear', 'special', 'arty'], title: '탄피가 한 개 모자란다', scene: 'camp', text: '사격이 끝나고 탄피를 세어 보니 한 개가 모자란다. 사로에 전원이 줄을 선 채 숨을 죽이고 있다. 내 자리 근처에서 나온 것 같다.',
    choices: [
      { t: '바로 손을 들고 자리를 확인해 달라고 한다', fx: { rep: 2, mind: -2 }, text: '내 자리 옆 풀숲에서 탄피가 발견됐다. 정직하게 말하니 분위기가 오히려 풀렸다.' },
      { t: '모른 척한다', p: s => .4,
        win: { fx: { mind: -2 }, text: '다른 곳에서 탄피가 나왔다. 가슴이 철렁했던 몇 분이었다.' },
        lose: { fx: { rep: -8, mind: -4, bond: -3 }, inc: 1, text: '결국 몇 시간 동안 전원이 재수색을 했다. 내가 입을 닫고 있었던 게 들통나 며칠간 분위기가 싸늘했다.' } },
    ] },
  { id: 'm_sns', r: [1, 3], w: 1.4, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: 'SNS 사진 한 장', text: '훈련 중에 찍은 멋진 사진을 SNS에 올리고 싶다. 하지만 군 장비와 시설이 같이 찍혀 있다.',
    choices: [
      { t: '올리지 않고 보안 규정을 떠올린다', fx: { mind: -1, rep: 2 }, text: '사진은 사회에 나가서 기억으로만 남긴다. 보안은 의외로 가볍지 않은 문제다.' },
      { t: '장비를 가려서 올린다', p: s => .5,
        win: { fx: { mind: 3 }, text: '아무 일도 없었다. 하지만 올린 뒤로 계속 마음 한구석이 찜찜하다.' },
        lose: { fx: { rep: -8, mind: -3, leave: -1 }, inc: 1, text: '보안 점검에서 적발됐다. 사진 삭제와 함께 휴대전화 사용 제한을 받았다.' } },
    ] },
  { id: 'm_doc_leak', r: [1, 3], w: 1.4, tags: ['office'], b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '수신처가 잘못 갔다', scene: 'office', text: '공문을 보냈는데 수신처를 잘못 적었다. 내부 문서가 엉뚱한 부대로 전송됐다.',
    choices: [
      { t: '즉시 보고하고 회수를 요청한다', fx: { rep: 1, mind: -3, skill: 2 }, text: '다행히 빠르게 회수됐다. 간부가 "빠른 보고가 최선"이라며 보안 교육을 한 번 더 시켰다.' },
      { t: '조용히 넘어가려 한다', p: s => .3,
        win: { fx: { mind: -1 }, text: '운 좋게 아무도 몰랐다. 하지만 이후 공문을 볼 때마다 손이 떨렸다.' },
        lose: { fx: { rep: -10, mind: -5 }, inc: 2, text: '상급 부대에서 확인 전화가 왔다. 보고하지 않은 것까지 겹쳐 크게 질책받았다.' } },
    ] },
  { id: 'm_dent', r: [0, 3], w: 1.6, tags: ['driver'], title: '차량 문콕', scene: 'camp', text: '좁은 주차장에서 차량 문을 열다 옆 차량에 가벼운 흠집을 냈다.',
    choices: [
      { t: '즉시 보고하고 사진을 남긴다', fx: { rep: 2, mind: -2, skill: 1 }, text: '사고보고서를 쓰고 정비 담당과 함께 확인했다. 경미한 손상이라 무사히 지나갔다.' },
      { t: '보고를 미루고 모른 척한다', p: s => .35,
        win: { fx: { mind: -2 }, text: '아무도 못 봤다. 하지만 이후 그 차량 앞에서만 서성거린다.' },
        lose: { fx: { rep: -9, mind: -4 }, inc: 2, text: '정비 점검에서 흠집이 발견되어 영상 확인까지 갔다. 은폐 시도가 문제가 되어 크게 질책받았다.' } },
    ] },
  { id: 'm_rice', r: [0, 3], w: 1.6, auto: true, tags: ['cook'], title: '밥이 설익었다', scene: 'camp', text: '취반기 설정을 잘못 눌러 밥이 설익은 채로 나왔다. 배식 줄은 이미 길게 늘어서 있다.', fx: { rep: -3, mind: -3, bond: -1 }, result: '그날 점심은 부대 전체가 라면으로 때웠다. 간부는 "다음에 꼭 확인하자"는 한마디만 남겼다.' },
  { id: 'm_prank', r: [3, 3], w: 1.2, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '말년의 장난', text: '전역이 코앞이다. 후임들 앞에서 간부 목소리를 흉내 내고 싶은 충동이 든다.',
    choices: [
      { t: '꾹 참는다', fx: { mind: 1, rep: 1 }, text: '속으로만 웃고 넘어갔다. 말년의 가장 큰 덕목은 참을성이다.' },
      { t: '딱 한 번만 해 본다', p: s => .4,
        win: { fx: { bond: 5, mind: 4 }, text: '모두가 폭소를 터뜨렸다. 마침 간부는 외출 중이었다.' },
        lose: { fx: { rep: -8, mind: -3 }, inc: 1, text: '간부가 바로 뒤에 서 있었다. 말년 병장이 연병장을 세 바퀴 돌았다.' } },
    ] },

  /* ----- 징계 · 의가사 ----- */
  { id: 'e_discipline1', r: [1, 3], w: 150, need: s => (s.flags.incidents || 0) >= 3 && !s.flags.disc1, title: '중대장 면담', text: '최근 사고가 이어지자 중대장이 면담을 요청했다. 책상 위에 지금까지의 기록이 놓여 있다. "이번에 정신 못 차리면 징계위원회를 열 수밖에 없다."',
    choices: [
      { t: '깊이 반성하고 재발 방지를 약속한다', fx: { rep: -2, mind: -3 }, inc: -2, set: { disc1: true }, text: '중대장은 오래 말이 없었다. "한 번만 더 믿어 보겠다."' },
      { t: '억울하다고 항변한다', p: s => .35,
        win: { fx: { rep: 1, mind: 2 }, inc: -1, set: { disc1: true }, text: '사정을 차분히 설명하자 중대장이 일부는 받아들였다. 경고 한 번으로 마무리됐다.' },
        lose: { fx: { rep: -8, mind: -4, leave: -3 }, inc: -1, set: { disc1: true }, text: '변명으로만 들렸다. 휴가 제한 처분이 내려졌다. 분위기가 한층 무겁다.' } },
      { t: '상담관과 먼저 이야기해 본다', fx: { mind: 6, rep: -1 }, inc: -2, set: { disc1: true }, text: '상담관이 차분히 듣고 중대장과의 면담을 조율해 줬다. 혼자 끌어안지 않아도 된다는 걸 알았다.' },
    ] },
  { id: 'e_discipline2', r: [1, 3], w: 150, auto: true, need: s => (s.flags.incidents || 0) >= 3 && s.flags.disc1 && !s.flags.disc2, hl: '잇따른 사고로 군기교육을 받고 정신을 번쩍 차림', title: '군기교육 처분', text: '잇따른 사고 끝에 결국 징계 처분이 내려졌다. 일정 기간 별도의 교육 과정에서 기본 군인정신을 다시 배우고 복귀한다.', fx: { rep: -12, mind: -6, body: -3, bond: -4 }, inc: -1, set: { disc2: true }, result: '복귀하고 보니 동기들의 계급장이 한 칸 위였다. 이제 정말 조용히 살기로 다짐했다.' },
  { id: 'e_med_board', r: [0, 3], w: 150, need: s => ((s.stats.mind <= 14 && s.flags.counsel) || (s.flags.disc2 && (s.flags.incidents || 0) >= 2 && s.stats.mind <= 42)) && !s.flags.medboard, flag: 'medboard', title: '군 병원 진료와 의무조사',
    text: s => (s.stats.mind <= 14
      ? '마음이 오래 가라앉아 있다. 상담관과 군의관이 함께 면담을 잡았다. "지금 상태로는 복무를 이어 가기 어려울 수 있습니다. 치료를 받으며 복무할지, 의무조사로 전역 심사를 받을지 함께 정해 봅시다." (이 게임은 실제 판정을 대신하지 않습니다. 힘들면 국방헬프콜 1303.)'
      : '잇따른 사고와 적응 문제로 관심병사로 분류됐다. 중대장, 상담관, 군의관이 모여 앉았다. "계속 이렇게 가면 본인에게도 부대에도 좋지 않습니다. 치료와 적응 지원을 받을지, 의무조사로 전역 심사를 받을지 정해야 합니다." (실제 판정은 훨씬 복잡합니다. 힘들면 국방헬프콜 1303.)'),
    choices: [
      { t: '치료와 적응 지원을 받으며 복무를 이어간다', fx: { mind: 14, body: 4, rep: -1 }, inc: -3, text: '정기 상담과 충분한 휴식. 한 달쯤 지나자 아침에 눈을 뜨는 일이 덜 무거워졌다. 간부들도 눈에 띄게 신경 써 준다.', hl: '마음이 바닥일 때 치료와 상담을 받으며 끝까지 복무함' },
      { t: '조금 더 버텨 본다', fx: { mind: 2 }, text: '"일단 해 볼게요." 군의관은 고개를 끄덕이며 재진 일정을 잡아 줬다. 언제든 다시 말해도 된다고 했다.' },
      { t: '의무조사를 받아 전역 심사를 받는다', fx: { mind: 6 }, endEarly: 'medical', text: '결정이 쉬웠던 건 아니다. 짐을 정리하는 동안 동기들이 말없이 어깨를 두드렸다.' },
    ] },

  /* ----- 황당하지만 있을 법한 실제 상황 ----- */
  { id: 'w_tv', r: [1, 3], w: 1.6, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '새벽 TV연등', text: '중요한 축구 경기가 있는 날, 간부가 특별히 TV연등을 허락했다. 새벽 세 시, 생활관이 함성으로 가득 찼다.', fx: { mind: 7, bond: 5, body: -1 }, result: '골이 터지자 옆 생활관에서도 소리가 들렸다. 다음 날 아침 점호는 유난히 비몽사몽이었다.' },
  { id: 'w_cat', r: [0, 3], w: 1.6, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '부대 길고양이', text: '부대 안에 길고양이가 눌러앉았다. 취사장 뒤편에서 병사들이 몰래 간식을 챙겨 준다. 이름은 만장일치로 "병장"이 됐다.', fx: { mind: 5, bond: 4 }, result: '"병장이 또 왔다." 중대장도 못 본 척한다. 군대에서도 고양이는 계급을 초월한다.' },
  { id: 'w_siren', r: [0, 3], w: 1.4, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '비상 사이렌 오작동', scene: 'night', text: '새벽 두 시, 부대 전체에 비상 사이렌이 울렸다. 군장을 메고 뛰어나가 보니 오작동이었다.', fx: { body: -2, mind: -2, bond: 2 }, result: '모두 허탈하게 웃으며 복귀했다. 눈이 말똥말똥해 잠은 다 달아났다.' },
  { id: 'w_inspector', r: [1, 3], w: 1.6, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '검열관의 한마디', text: '상급 부대 검열관이 갑자기 질문을 던진다. "이 부대의 임무가 뭐지?" 주변이 얼어붙었다.',
    choices: [
      { t: '침착하게 교육받은 대로 답한다', p: s => .6,
        win: { fx: { rep: 6, mind: 2 }, text: '정확한 답변에 검열관이 고개를 끄덕였다. 중대장이 몰래 엄지를 올렸다.' },
        lose: { fx: { rep: -3, mind: -2 }, text: '머리가 하얘져 다른 부대 이름을 말해 버렸다. 검열이 끝나고 한참 놀림당했다.' } },
      { t: '옆 동기에게 눈짓으로 도움을 청한다', fx: { bond: 2, rep: -2 }, text: '눈치로 힌트를 받아 간신히 넘겼다. 둘 다 얼굴이 새빨개졌다.' },
    ] },
  { id: 'w_package', r: [0, 3], w: 1.4, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '소포 도착', text: '가족이 보낸 소포가 도착했다. 상자를 열자 초코파이와 양말, 편지가 가득하다. 소문을 들은 생활관 전원이 모여들었다.', fx: { mind: 6, bond: 5 }, result: '초코파이는 순식간에 사라졌다. 편지는 몰래 한 장씩 아껴 읽는다.' },
  { id: 'w_hat', r: [0, 1], w: 1.2, auto: true, b: ['army', 'navy', 'af', 'marine', 'katusa'], title: '전투모가 바뀌었다', text: '점호 후 내 전투모가 옆 사람 것과 바뀐 줄 몰랐다. 한참 후에야 이름표가 달라 보였다.', fx: { mind: -1, bond: 2 }, result: '서로 모자를 돌려주며 웃었다. 이병 시절의 아주 작은 이야기.' },

];

/* 한가한 주 (필러) */
const QUIET_LINES = [
  '특별한 일은 없었다. 아침 점호, 일과, 저녁 점호. 같은 일상이 이어진다.',
  '비가 오락가락하는 한 주. 창밖을 보며 전역 날짜를 헤아려 본다.',
  '동기와 달력에 빨간 동그라미를 쳤다. 하루하루가 천천히, 그러나 확실히 줄어든다.',
  '일과 후 책을 펴 놓고 졸았다. 작은 평화가 찾아온 주.',
  '점심 메뉴가 의외로 괜찮았다. 한 끼의 행복이 이렇게 컸나.',
  '선임의 농담에 모두가 웃음을 터뜨렸다. 오늘은 이상하게 분위기가 좋다.',
  '"자기 군생활이 가장 힘든 법이지." 생활관 누군가가 오늘도 같은 말을 한다.',
  '"땡보직인지 아닌지는 보직보다 부대가 정한다." 누군가 던진 말이 오늘따라 설득력 있다.',
  '"국방부 시계는 거꾸로 매달아 놔도 돌아간다." 달력의 날짜를 하나 지웠다.',
];

/* 오늘의 군대 용어 (한가한 주에 간간이 등장) */
const GLOSSARY = [
  ['짬', '군 복무로 쌓인 기간이나 경력'],
  ['말출', '말년에 나가는 휴가, 전역 직전의 마지막 휴가'],
  ['일꺾·상꺾', '일병·상병 시기의 절반을 넘긴 때. 이때부터 시간이 빨리 간다'],
  ['진누', '진급누락의 줄임말'],
  ['열외', '근무·훈련·작업에서 빠지는 것'],
  ['연등', '정해진 취침 시간 뒤에도 불을 켜 두는 것'],
  ['TV연등', '허락된 날 TV를 더 보게 해 주는 시간'],
  ['관물대', '개인 물품을 보관하는 사물함'],
  ['반합', '밥을 지을 수 있는 알루미늄 식기'],
  ['황금마차', '격오지 부대를 돌며 오는 이동식 PX'],
  ['왕고', '부대에서 가장 오래된 병사'],
  ['에이스', '눈치 빠르고 일 잘하는 병사'],
  ['선탑', '차량 조수석에 타는 선임자(간부)'],
  ['풀침', '야간근무 없이 온전히 자는 날'],
  ['초번초·말번초', '불침번의 첫 근무와 마지막 근무. 초번초는 선호, 그 앞의 말전초는 기피'],
  ['아들·아버지', '군번이 1년 차이 나는 후임·선임'],
  ['식집', '식사를 위해 단위별로 모이는 것'],
  ['말년병장', '전역이 가까운 병장. 공식 용어는 "전역대기자"'],
  ['싸지방', '사이버지식정보방. 휴대전화 허용 뒤로 한산해졌다'],
  ['행보관', '중대의 행정과 보급을 맡는 행정보급관'],
  ['폐급', '일을 영 못 따라가는 병사를 낮춰 부르는 속어. 놀림감으로 쓰면 분위기가 나빠진다'],
  ['의가사', '의병전역·가사전역을 합쳐 부르는 말. 의무조사를 거쳐 사유가 인정되어야 한다'],
  ['관심병사', '적응이나 건강 문제로 간부가 특별히 관리하는 병사. 도움이 필요하다는 신호이기도 하다'],
];

/* ---------- 휴가 계획 ---------- */
const LEAVE_PLANS = [
  { t: '집에서 푹 쉰다', fx: { mind: 10, body: 6, money: -2 }, text: '엄마가 차려 준 집밥을 먹고 눕자마자 12시간을 내리 잤다. 이게 행복이다.' },
  { t: '친구들과 신나게 논다', fx: { mind: 12, money: -20, bond: 1, body: -2 }, text: '술 없이도 밤새도록 웃었다. 시간이 순식간에 사라졌다.' },
  { t: '곰신과 데이트한다', need: s => s.gf, fx: { mind: 10, gf: 14, money: -18 }, text: '손을 꼭 잡고 거리를 걸었다. 헤어질 때가 되자 시간이 너무 빠르다.' },
  { t: '자격증 시험을 보러 간다', fx: { skill: 9, mind: 3, money: -3 }, text: '오랜만에 보는 시험. 긴장했지만 결과가 기대된다.' },
  { t: '병원·치과를 다닌다', fx: { body: 8, mind: 2, money: -8 }, text: '미뤄 둔 치료를 한꺼번에 받았다. 몸이 한결 가볍다.' },
];

/* ---------- 엔딩(칭호) ---------- */
const TITLES = [
  { id: 'legend',  name: '병영의 전설',           test: s => s.stats.rep >= 64 && s.stats.bond >= 68,        line: '전역하는 날 후임들이 부대 정문까지 배웅하러 나왔습니다.' },
  { id: 'spec',    name: '군대에서 스펙 쌓은 사람', test: s => s.stats.skill >= 68,                            line: '복무 중 쌓은 자격증과 경험이 전역 후 이력서의 한 줄이 됩니다.' },
  { id: 'iron',    name: '철인 전역자',           test: s => s.stats.body >= 72,                            line: '전역하는 날 군복이 작아졌다는 사실을 깨달았습니다. 어깨가 두 배가 됐어요.' },
  { id: 'honey',   name: '꿀 빤 인생',            test: s => s.luck >= 3 && s.stats.mind >= 62,              line: '"군대 별거 없던데?" 이 말을 하는 순간 주변의 시선이 싸늘해집니다.' },
  { id: 'hell',    name: '지옥에서 살아 돌아온 자', test: s => s.luck <= -2 && s.stats.mind >= 42,            line: '힘든 만큼 단단해졌습니다. 이제 어떤 일이든 "그래도 군대보단 낫지"가 됩니다.' },
  { id: 'friend',  name: '전우애의 화신',         test: s => s.stats.bond >= 72,                             line: '동기와 후임 모두 연락처를 남기고 갔습니다. 단체 채팅방은 지금도 활발합니다.' },
  { id: 'rich',    name: '목돈 알뜰족',           test: s => s.money >= 640,                                 line: '적금과 월급이 쌓여 전역하자마자 든든한 시작 자금이 생겼습니다.' },
  { id: 'zen',     name: '멘탈 갑 전역자',        test: s => s.stats.mind >= 88,                             line: '어떤 상황에도 흔들리지 않는 평정심을 얻었습니다. 이제 면접장도 무섭지 않습니다.' },
  { id: 'love',    name: '곰신과 해피엔딩',       test: s => s.gf && s.gfLove >= 58,                         line: '정문 앞에서 꽃다발을 든 곰신이 기다리고 있었습니다. 기다려 준 시간만큼 오래 이어지길.' },
  { id: 'trouble', name: '사고뭉치 전역자',      test: s => (s.flags.incTotal || 0) >= 4,                  line: '전역할 때까지 간부들의 요주의 목록 상단에 이름이 있었습니다. 그래도 끝까지 완주했습니다.' },
  { id: 'survive', name: '버티고 버텨 전역',      test: s => s.stats.mind < 44,                              line: '쉽지 않은 시간이었지만 끝내 버텨 냈습니다. 이제 푹 쉬어도 됩니다.' },
  { id: 'plain',   name: '무난하게 전역한 대한민국 건아', test: () => true,                                   line: '특별한 사건 없이, 그러나 소중한 시간이 흘러갔습니다. 수고하셨습니다.' },
];

/* 확률 → 희귀도 */
function rarityOf(p) {
  if (p < .015) return { k: 'UR', name: 'UR', cls: 'ur' };
  if (p < .04) return { k: 'SSR', name: 'SSR', cls: 'ssr' };
  if (p < .10) return { k: 'SR', name: 'SR', cls: 'sr' };
  if (p < .30) return { k: 'R', name: 'R', cls: 'r' };
  return { k: 'N', name: 'N', cls: 'n' };
}
