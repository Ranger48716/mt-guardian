const HOME_KEY = 'gof:tour-v2'
const MAP_KEY = 'gof:map-tour-v1'

export const HOME_TOUR = [
  {
    target: 'modes',
    text: 'Для каждого режима боя на карте свой гайд. Выбери нужный — список карт обновится.',
  },
  {
    target: 'guides',
    text: '«Есть гайды» показывает только те карты, на которые выпущен гайд. Выключи, чтобы увидеть весь список карт в игре.',
  },
  {
    target: 'search',
    text: 'Можно ввести название карты в поиск.',
  },
  {
    target: 'maps',
    text: 'Нажми карточку, чтобы открыть гайд.',
  },
  {
    target: 'status',
    text: 'Бейдж «Новый» — появился свежий гайд по карте, скорее смотреть!',
  },
  {
    target: 'help',
    text: 'Если хочешь еще раз посмотреть обучающий тур, нажми сюда',
  },
] as const

export const MAP_TOUR = [
  {
    target: 'resp',
    text: 'Тут можно менять советы для каждого респауна.',
  },
  {
    target: 'modes',
    text: 'Если у карты несколько режимов — переключись здесь.',
  },
  {
    target: 'classes',
    text: 'Тут выбирай советы для определенного класса техники.',
  },
  {
    target: 'map',
    text: 'Совет по позиционке показан точкой на карте. Нажми точку, чтобы открыть описание совета.',
  },
  {
    target: 'note',
    text: 'Описание по позиции отображается тут. Можно переключать стрелочками или по клику на позицию.',
  },
  {
    target: 'help',
    text: 'Если хочешь еще раз посмотреть обучающий тур, нажми сюда',
  },
] as const

function readStep(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return 1
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeStep(key: string, n: number): number {
  try {
    localStorage.setItem(key, String(n))
  } catch {
    /* ignore */
  }
  return n
}

export function homeTourStep(): number {
  return readStep(HOME_KEY)
}

export function saveHomeTour(n: number): number {
  return writeStep(HOME_KEY, n)
}

export function finishHomeTour(): number {
  return writeStep(HOME_KEY, 0)
}

export function startHomeTour(): number {
  return writeStep(HOME_KEY, 1)
}

export function mapTourStep(): number {
  return readStep(MAP_KEY)
}

export function saveMapTour(n: number): number {
  return writeStep(MAP_KEY, n)
}

export function finishMapTour(): number {
  return writeStep(MAP_KEY, 0)
}

export function startMapTour(): number {
  return writeStep(MAP_KEY, 1)
}
