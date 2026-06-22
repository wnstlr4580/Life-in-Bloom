import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.product.createMany({
    data: [
      {
        name: "봄날의 튤립 다발",
        description: "싱그러운 봄을 담은 알록달록 튤립 다발. 사랑하는 사람에게 전하는 새로운 시작의 메시지.",
        price: 35000,
        stock: 20,
        category: "bouquet",
        images: [],
        flowerMeaning: "사랑의 고백",
        ohaengTags: ["목", "화"],
        seasonTags: ["spring"],
        colorTags: ["pink", "red", "yellow"],
      },
      {
        name: "청초한 수국 화분",
        description: "풍성하고 청초한 수국 화분. 공간에 우아함을 더해줍니다.",
        price: 28000,
        stock: 15,
        category: "plant",
        images: [],
        flowerMeaning: "진심 어린 감사",
        ohaengTags: ["수", "목"],
        seasonTags: ["summer", "spring"],
        colorTags: ["blue", "purple", "white"],
      },
      {
        name: "순백의 백합 부케",
        description: "순수하고 우아한 백합 부케. 특별한 날을 더욱 빛내줍니다.",
        price: 45000,
        stock: 10,
        category: "bouquet",
        images: [],
        flowerMeaning: "순수와 고귀함",
        ohaengTags: ["금"],
        seasonTags: ["spring", "summer"],
        colorTags: ["white"],
      },
      {
        name: "열정의 장미 다발",
        description: "붉은 장미 한 아름. 당신의 마음을 전하는 가장 확실한 방법.",
        price: 55000,
        stock: 25,
        category: "bouquet",
        images: [],
        flowerMeaning: "열정적인 사랑",
        ohaengTags: ["화"],
        seasonTags: ["spring", "summer", "autumn"],
        colorTags: ["red"],
      },
      {
        name: "가을빛 국화 화환",
        description: "따뜻한 가을 감성을 담은 국화 화환. 소중한 마음을 전하세요.",
        price: 40000,
        stock: 12,
        category: "wreath",
        images: [],
        flowerMeaning: "오랜 인연",
        ohaengTags: ["토"],
        seasonTags: ["autumn"],
        colorTags: ["yellow", "beige"],
      },
      {
        name: "라벤더 드라이플라워",
        description: "은은한 향기를 오래도록 간직하는 라벤더 드라이플라워 다발.",
        price: 22000,
        stock: 30,
        category: "dried",
        images: [],
        flowerMeaning: "침묵의 사랑",
        ohaengTags: ["수"],
        seasonTags: ["summer", "autumn"],
        colorTags: ["purple"],
      },
      {
        name: "해바라기 미니 화분",
        description: "작지만 밝고 활기찬 해바라기 미니 화분. 매일 웃음을 선물해요.",
        price: 18000,
        stock: 20,
        category: "plant",
        images: [],
        flowerMeaning: "당신만을 바라봐요",
        ohaengTags: ["화", "토"],
        seasonTags: ["summer"],
        colorTags: ["yellow"],
      },
      {
        name: "파스텔 혼합 꽃다발",
        description: "부드러운 파스텔 톤의 꽃들로 구성된 감성적인 혼합 꽃다발.",
        price: 38000,
        stock: 18,
        category: "bouquet",
        images: [],
        flowerMeaning: "행복한 순간",
        ohaengTags: ["금", "목"],
        seasonTags: ["spring", "summer"],
        colorTags: ["pink", "white", "cream"],
      },
    ],
    skipDuplicates: true,
  })

  console.log("✅ Seed data created")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
