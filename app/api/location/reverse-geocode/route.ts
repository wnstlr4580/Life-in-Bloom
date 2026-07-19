import { NextRequest, NextResponse } from "next/server"

type KakaoAddressResponse = {
  documents?: Array<{
    road_address?: { address_name?: string } | null
    address?: { address_name?: string } | null
  }>
}

export async function GET(req: NextRequest) {
  const latitude = Number(req.nextUrl.searchParams.get("lat"))
  const longitude = Number(req.nextUrl.searchParams.get("lng"))
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "좌표를 확인해주세요." }, { status: 400 })
  }

  try {
    const restApiKey = process.env.KAKAO_CLIENT_ID
    if (restApiKey) {
      const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json")
      kakaoUrl.searchParams.set("x", String(longitude))
      kakaoUrl.searchParams.set("y", String(latitude))
      kakaoUrl.searchParams.set("input_coord", "WGS84")
      const kakaoResponse = await fetch(kakaoUrl, {
        headers: { Authorization: `KakaoAK ${restApiKey}` },
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
      })
      if (kakaoResponse.ok) {
        const data = await kakaoResponse.json() as KakaoAddressResponse
        const document = data.documents?.[0]
        const kakaoAddress = document?.road_address?.address_name || document?.address?.address_name
        if (kakaoAddress) return NextResponse.json({ address: kakaoAddress, provider: "kakao" })
      }
    }

    const osmUrl = new URL("https://nominatim.openstreetmap.org/reverse")
    osmUrl.searchParams.set("lat", String(latitude))
    osmUrl.searchParams.set("lon", String(longitude))
    osmUrl.searchParams.set("format", "jsonv2")
    osmUrl.searchParams.set("accept-language", "ko")
    osmUrl.searchParams.set("addressdetails", "1")
    const osmResponse = await fetch(osmUrl, {
      headers: { "User-Agent": "Life-in-Bloom/0.1 (help@life-in-bloom.example)" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    })
    if (!osmResponse.ok) throw new Error(`osm:${osmResponse.status}`)
    const osm = await osmResponse.json() as {
      display_name?: string
      address?: Record<string, string>
    }
    const parts = [
      osm.address?.city || osm.address?.state,
      osm.address?.borough || osm.address?.city_district || osm.address?.county,
      osm.address?.suburb || osm.address?.quarter,
      osm.address?.road,
      osm.address?.house_number,
    ].filter(Boolean)
    const osmAddress = [...new Set(parts)].join(" ") || osm.display_name
    if (!osmAddress) return NextResponse.json({ error: "현재 위치의 주소를 찾지 못했어요." }, { status: 404 })
    return NextResponse.json({ address: osmAddress, provider: "openstreetmap" })
  } catch {
    return NextResponse.json({ error: "현재 위치의 주소를 불러오지 못했어요." }, { status: 502 })
  }
}
