// Fixed vocabularies for the knowledge base. Entries may only use these keys, so the
// safety layer can later match cautions and interactions against a person's profile.

export const CAUTION_GROUPS = {
  pregnancy: 'Pregnancy',
  breastfeeding: 'Breastfeeding',
  infants: 'Babies under 1',
  children: 'Children',
  surgery: 'Before surgery',
  'bleeding-disorder': 'Bleeding disorders',
  diabetes: 'Diabetes',
  hypertension: 'High blood pressure',
  heart: 'Heart disease',
  cholesterol: 'High cholesterol',
  thyroid: 'Thyroid conditions',
  liver: 'Liver disease',
  kidney: 'Kidney disease',
  gallstones: 'Gallstones',
  gerd: 'Acidity, reflux or ulcers',
  'digestive-illness': 'Diarrhoea or bowel disease',
  autoimmune: 'Autoimmune conditions',
  'hormone-sensitive': 'Hormone-sensitive conditions',
  allergy: 'Allergies',
  'skin-infection': 'Broken or infected skin',
  'skin-use': 'Applying to the skin',
  asthma: 'Asthma',
  cancer: 'Cancer or cancer treatment',
}

export const DRUG_CLASSES = {
  anticoagulants: 'Blood thinners (for example warfarin, aspirin, clopidogrel)',
  antidiabetics: 'Diabetes medicines (for example metformin, insulin)',
  antihypertensives: 'Blood pressure medicines',
  diuretics: 'Water pills (diuretics)',
  corticosteroids: 'Steroid medicines (for example prednisolone)',
  sedatives: 'Sleeping pills and sedatives',
  thyroid: 'Thyroid medicines',
  immunosuppressants: 'Immune-suppressing medicines',
  'heart-rhythm': 'Heart medicines such as digoxin',
  lithium: 'Lithium',
  antiretrovirals: 'HIV medicines',
  anticonvulsants: 'Anti-seizure medicines',
  'many-medicines': 'Many medicines (changes absorption)',
  statins: 'Cholesterol medicines (statins)',
  antidepressants: 'Antidepressants and other medicines that affect serotonin',
}

export const EVIDENCE_LEVELS = {
  traditional: { label: 'Traditional use', note: 'Described in Ayurvedic tradition; little or no clinical research.' },
  preclinical: { label: 'Laboratory studies', note: 'Studied mainly in the laboratory or in animals, not yet in people.' },
  'limited-human': { label: 'Limited human studies', note: 'A few small or short human studies; not established.' },
  'moderate-human': { label: 'Several human studies', note: 'Several human trials point the same way; still not a cure.' },
}

export const REVIEW_STATUSES = {
  draft: 'Draft: not yet reviewed by a qualified Ayurvedic practitioner',
  reviewed: 'Reviewed by a qualified Ayurvedic practitioner',
}

// Plain-language meanings for classical terms, shown beside the Sanskrit
export const GLOSSARY = {
  rasa: 'Taste',
  guna: 'Qualities',
  virya: 'Potency (heating or cooling)',
  vipaka: 'Post-digestive effect',
  madhura: 'sweet', amla: 'sour', lavana: 'salty', katu: 'pungent', tikta: 'bitter', kashaya: 'astringent',
  laghu: 'light', guru: 'heavy', snigdha: 'unctuous', ruksha: 'dry', tikshna: 'sharp', sukshma: 'subtle', pichchhila: 'slimy',
  ushna: 'heating', shita: 'cooling',
  vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha',
}

export const term = (word) => GLOSSARY[word] ? `${word} (${GLOSSARY[word]})` : word
