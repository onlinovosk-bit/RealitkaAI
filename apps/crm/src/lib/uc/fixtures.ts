/** Real payloads from United Classifieds export API documentation (v1). */
export const UC_DOC_AGENT_SAMPLE = {
  import_id: "testImport",
  user_id: "testImport",
  deleted: 0,
  full_name: "Testovací Maklér",
  phone_work: "0912345678",
  email_work: "mail@mail.mm",
  sora: 1,
  nark: 0,
  image: {
    url: "https://admin.realsoft.sk/users-photos/3325.jpg",
    changed: false,
  },
} as const;

export const UC_DOC_LISTING_SAMPLE = {
  import_id: "testImpot",
  object_id: 784691,
  id: "rk-784691",
  deleted: 0,
  action: 1,
  category: 4,
  subcategory: 401,
  ownership: 1,
  price: 569,
  balconies_count: 22,
  state_id: 1,
  county_id: 0,
  district_id: 0,
  region_id: 0,
  street_id: 0,
  street: "Hlavná",
  street_number: "12",
  price_unit: 1,
  price_currency: 1,
  usable_area: 24,
  agent_id: "testImport",
  images: [
    {
      url: "https://admin.realsoft.sk/objects-images/784/784691/784691_1.jpg",
      changed: false,
    },
    {
      url: "https://admin.realsoft.sk/images/new/logo-realsoft.jpg",
      changed: false,
    },
  ],
  title: "Nadpis",
  description: "Popis",
  langData: {
    en: { title: "Title", description: "Description" },
    de: { title: "Titel", description: "Beschreibung" },
  },
  medias: {
    youtube: ["https://www.youtube.com/watch?v=doc-123"],
    matterport: ["https://my.matterport.com/show/?m=AbcdeF1G2h"],
  },
} as const;
