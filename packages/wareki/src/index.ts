const { WAREKI_START_YEARS, reg, selectGengo } = (() => {
  const REIWA = '令和' as const
  const HEISEI = '平成' as const
  const SHOWA = '昭和' as const
  const TAISHO = '大正' as const
  const MEIJI = '明治' as const
  type Geongo = typeof REIWA | typeof HEISEI | typeof SHOWA | typeof TAISHO | typeof MEIJI

  const SEPARATOR = '[:\\/\\-\\.\\s．年月日]'
  const WAREKI_BOUNDARYS = [
    [REIWA, 2019, 4, 30, HEISEI],
    [HEISEI, 1989, 1, 7, SHOWA],
    [SHOWA, 1926, 12, 24, TAISHO],
    [TAISHO, 1912, 7, 29, MEIJI],
  ] as const
  const YEARS = {
    t: 1912,
    T: 1912,
    [TAISHO]: 1912,
    s: 1926,
    S: 1926,
    [SHOWA]: 1926,
    h: 1989,
    H: 1989,
    [HEISEI]: 1989,
    r: 2019,
    R: 2019,
    [REIWA]: 2019,
    m: 1868,
    M: 1868,
    [MEIJI]: 1868,
  } as const

  return {
    WAREKI_START_YEARS: YEARS,
    reg: {
      dateString: new RegExp(
        `^([0-9]{4})(${SEPARATOR})?([0-9]{1,2})(${SEPARATOR})?([0-9]{1,2})([\\s．]([0-9]{2}):([0-9]{2})$)?`,
      ),
      wareki: new RegExp(
        `^(${Object.keys(YEARS).join(
          '|',
        )})([0-9]{1,2})(${SEPARATOR})([0-9]{1,2})(${SEPARATOR})([0-9]{1,2})(${SEPARATOR}?)$`,
      ),
    },
    selectGengo: (year: number, month: number, date: number): Geongo => {
      for (const [modern, boundaryYear, boundaryMonth, boundaryDay, ancient] of WAREKI_BOUNDARYS) {
        if (year > boundaryYear) {
          return modern
        } else if (year === boundaryYear) {
          if (month > boundaryMonth || (month === boundaryMonth && date > boundaryDay)) {
            return modern
          }
          return ancient
        }
      }

      return MEIJI
    },
  }
})()
// TODO: ほかの全角文字も半角に治す必要があるかも？
const fullWidthToHalfWidth = (dateString: string) =>
  dateString.replace(/[ａ-ｚＡ-Ｚ０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))

type Result<T> = {
  isValid: boolean
  result: T
}

export function dateToWareki(d: string | Date): Result<string> {
  const dateString = d instanceof Date ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : d
  const matcher = fullWidthToHalfWidth(dateString).match(reg.dateString)

  if (!matcher) {
    return {
      isValid: false,
      result: dateString,
    }
  }

  const year = Number(matcher[1])
  const month = Number(matcher[3])
  const date = Number(matcher[5])

  const gengo = selectGengo(year, month, date)
  // 和暦は1年から始まるので + 1 が必要
  const warekiYear = year - WAREKI_START_YEARS[gengo] + 1

  return {
    isValid: true,
    result: `${gengo}${warekiYear === 1 ? '元' : warekiYear}年${month}月${date}日`,
  }
}

export function warekiToDate(wareki: string): Result<Date> {
  const formattedWareki = fullWidthToHalfWidth(wareki)

  // parse as japanese era
  const matchedJpnEra = formattedWareki.match(reg.wareki)

  if (matchedJpnEra) {
    const baseYear = WAREKI_START_YEARS[matchedJpnEra[1] as keyof typeof WAREKI_START_YEARS]

    return {
      isValid: true,
      // 和暦は1年から始まるので - 1 が必要
      result: new Date(
        baseYear + Number(matchedJpnEra[2]) - 1,
        Number(matchedJpnEra[4]) - 1,
        Number(matchedJpnEra[6]),
      ),
    }
  }

  // parse as A.D.
  const matchedAD = formattedWareki.match(reg.dateString)

  if (matchedAD) {
    return {
      isValid: true,
      result: new Date(Number(matchedAD[1]), Number(matchedAD[3]) - 1, Number(matchedAD[5])),
    }
  }

  return {
    isValid: false,
    result: new Date(formattedWareki),
  }
}
