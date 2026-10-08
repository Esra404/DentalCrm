This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Yerel veritabanı, ilk yönetici ve tedavi kataloğu

`.env.example` dosyasını `.env` olarak kopyalayın, yerel PostgreSQL bağlantısını
ve `AUTH_SECRET` değerini ayarlayın. Şema migration'larını uyguladıktan sonra ilk
yönetici hesabını güvenli şekilde oluşturmak için:

```powershell
npm run dev:create-admin
```

Komut yalnızca yerel `dental_crm` veritabanını kabul eder; e-posta ve şifreyi
interaktif terminalden alır, şifreyi ekranda göstermez ve yalnızca hash'ini saklar.
İsteğe bağlı başlangıç tedavi kataloğunu eklemek için:

```powershell
npm run db:seed
```

Katalog 19 tedaviyi aktif ve `0 TRY` fiyatla ekler; her klinik kendi fiyatlarını
ayarlamalıdır. Seed tekrar çalıştığında aynı isimleri çoğaltmaz ve varsayılan
kayıtları yeniden etkinleştirir; mevcut fiyatları korur. Kategoriler, ayrı şema alanı bulunmadığı için tedavi açıklamasının başında tutulur.
Varsayılan olarak bu komut yalnızca yerel `dental_crm` veritabanında çalışır.
Kullanıcı onayıyla bilinen Neon `neondb` hedefine uygulamak için:

```powershell
$env:ALLOW_NEON_TREATMENT_SEED = "true"
npm run db:seed
Remove-Item Env:ALLOW_NEON_TREATMENT_SEED
```

Uzak seed üretim ortamında, bu değişken ayarlansa dahi çalışmaz. Geliştirme sunucusunu `npm run dev` ile
başlatın ve `/login` sayfasından yönetici hesabınızla giriş yapın. Başarılı giriş
`/dashboard` adresine yönlendirir. İzin kontrolleri sunucu tarafında `requireRole`
/ `requireRoles` yardımcılarıyla yapılmalıdır.

Yönetici, oturum açtıktan sonra `/users` sayfasından Doktor veya Çalışan hesabı
oluşturabilir. Doktor hesabı ve `Doctor` CRM profili aynı veritabanı transaction'ı
içinde `User.id` üzerinden bağlanır; Doctor uzmanlık alanı isteğe bağlıdır.

## Hasta Belgeleri

Hasta dosyaları PostgreSQL'e veya `public` klasörüne yazılmaz; yerel geliştirmede
`.private-storage/patient-documents` dizininde saklanır. Bu dizin Git tarafından
yok sayılır. Yükleme yalnızca PDF, JPEG ve PNG dosyalarını (en fazla 10 MB)
kabul eder. Hasta belgesi alanları için veritabanı migration'ı uygulanmadan
belge ekranlarını kullanmayın.

Bu yerel dosya deposu üretim ortamı için dayanıklı bir storage çözümü değildir.
Üretimde uygulamanın private ve kalıcı bir volume ile çalıştırılması veya ayrıca
onaylanmış bir storage sağlayıcısına geçilmesi gerekir.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
