import { diseases } from './diseases.js'

// Each category is anchored to one classical herb, shown as a botanical plate
// (see components/Botanicals.jsx). Compounds are the constituents most often
// studied for each plant; listing them is not a claim of effect.
export const beds = [
  { id: 'all', label: 'All conditions', herb: 'all', herbName: 'Materia medica', hindi: 'द्रव्यगुण', latin: 'The full library' },
  { id: 'respiratory', label: 'Breath & cold', herb: 'tulsi', herbName: 'Tulsi', hindi: 'तुलसी', latin: 'Ocimum tenuifolium', part: 'Leaf', compounds: 'Eugenol, ursolic acid, rosmarinic acid' },
  { id: 'digestive', label: 'Digestion', herb: 'saunf', herbName: 'Saunf', hindi: 'सौंफ', latin: 'Foeniculum vulgare', part: 'Seed', compounds: 'trans-Anethole, fenchone' },
  { id: 'mental', label: 'Mind & sleep', herb: 'brahmi', herbName: 'Brahmi', hindi: 'ब्राह्मी', latin: 'Bacopa monnieri', part: 'Whole herb', compounds: 'Bacosides A and B' },
  { id: 'skin', label: 'Skin', herb: 'haldi', herbName: 'Haldi', hindi: 'हल्दी', latin: 'Curcuma longa', part: 'Rhizome', compounds: 'Curcuminoids, ar-turmerone' },
  { id: 'musculoskeletal', label: 'Joints', herb: 'adrak', herbName: 'Adrak', hindi: 'अदरक', latin: 'Zingiber officinale', part: 'Rhizome', compounds: 'Gingerols, shogaols' },
  { id: 'chronic', label: 'Long-term care', herb: 'neem', herbName: 'Neem', hindi: 'नीम', latin: 'Azadirachta indica', part: 'Leaf', compounds: 'Azadirachtin, nimbin, nimbidin' },
]

export const bedFor = (categoryId) => beds.find(b => b.id === categoryId) || beds[0]

// What's on the shelf: household names first, matched against remedy text
const shelf = [
  { id: 'tulsi', fill: 'tulsi', name: 'Tulsi', hindi: 'तुलसी', match: /tulsi|holy basil/i },
  { id: 'adrak', fill: 'saunth', name: 'Adrak', english: 'ginger', hindi: 'अदरक', match: /ginger/i },
  { id: 'haldi', fill: 'haldi', name: 'Haldi', english: 'turmeric', hindi: 'हल्दी', match: /turmeric/i },
  { id: 'shahad', fill: 'shahad', name: 'Shahad', english: 'honey', hindi: 'शहद', match: /honey/i },
  { id: 'ajwain', fill: 'ajwain', name: 'Ajwain', english: 'carom', hindi: 'अजवाइन', match: /ajwain/i },
  { id: 'jeera', fill: 'jeera', name: 'Jeera', english: 'cumin', hindi: 'जीरा', match: /jeera|cumin/i },
  { id: 'saunf', fill: 'saunf', name: 'Saunf', english: 'fennel', hindi: 'सौंफ', match: /saunf|fennel/i },
  { id: 'methi', fill: 'methi', name: 'Methi', english: 'fenugreek', hindi: 'मेथी', match: /methi|fenugreek/i },
  { id: 'dalchini', fill: 'dalchini', name: 'Dalchini', english: 'cinnamon', hindi: 'दालचीनी', match: /cinnamon/i },
  { id: 'kali-mirch', fill: 'kali-mirch', name: 'Kali mirch', english: 'black pepper', hindi: 'काली मिर्च', match: /black pepper/i },
  { id: 'sendha', fill: 'sendha', name: 'Sendha namak', english: 'rock salt', hindi: 'सेंधा नमक', match: /rock salt|saline/i },
  { id: 'chaas', fill: 'chaas', name: 'Chaas', english: 'buttermilk', hindi: 'छाछ', match: /buttermilk/i },
  { id: 'doodh', fill: 'doodh', name: 'Doodh', english: 'milk', hindi: 'दूध', match: /\bmilk\b/i },
  { id: 'ghee', fill: 'ghee', name: 'Ghee', hindi: 'घी', match: /ghee/i },
  { id: 'til-tel', fill: 'til-tel', name: 'Til tel', english: 'sesame oil', hindi: 'तिल का तेल', match: /sesame oil/i },
  { id: 'nariyal-tel', fill: 'nariyal-tel', name: 'Nariyal tel', english: 'coconut oil', hindi: 'नारियल तेल', match: /coconut oil/i },
  { id: 'nimbu', fill: 'nimbu', name: 'Nimbu', english: 'lemon', hindi: 'नींबू', match: /lemon/i },
  { id: 'pudina', fill: 'pudina', name: 'Pudina', english: 'mint', hindi: 'पुदीना', match: /pudina|mint|peppermint/i },
  { id: 'dhania', fill: 'dhania', name: 'Dhania', english: 'coriander', hindi: 'धनिया', match: /dhania|coriander/i },
  { id: 'curry-patta', fill: 'curry-patta', name: 'Curry patta', english: 'curry leaves', hindi: 'करी पत्ता', match: /curry lea/i },
  { id: 'pippali', fill: 'pippali', name: 'Pippali', english: 'long pepper', hindi: 'पिप्पली', match: /pippali|long pepper/i },
  { id: 'mulethi', fill: 'mulethi', name: 'Mulethi', english: 'licorice', hindi: 'मुलेठी', match: /mulethi|licorice|liquorice/i },
  { id: 'alsi', fill: 'alsi', name: 'Alsi', english: 'flaxseed', hindi: 'अलसी', match: /alsi|flaxseed/i },
  { id: 'isabgol', fill: 'isabgol', name: 'Isabgol', english: 'psyllium husk', hindi: 'इसबगोल', match: /isabgol|psyllium/i },
  { id: 'anar', fill: 'anar', name: 'Anar', english: 'pomegranate', hindi: 'अनार', match: /anar|pomegranate/i },
  { id: 'amla', fill: 'amla', name: 'Amla', english: 'Indian gooseberry', hindi: 'आंवला', match: /amla/i },
  { id: 'neem', fill: 'neem', name: 'Neem', hindi: 'नीम', match: /neem/i },
  { id: 'aloe', fill: 'aloe', name: 'Gwarpatha', english: 'aloe vera', hindi: 'ग्वारपाठा', match: /aloe/i },
  { id: 'karela', fill: 'karela', name: 'Karela', english: 'bitter gourd', hindi: 'करेला', match: /karela|bitter melon/i },
  { id: 'triphala', fill: 'triphala', name: 'Triphala', hindi: 'त्रिफला', match: /triphala/i },
  { id: 'ashwagandha', fill: 'ashwagandha', name: 'Ashwagandha', hindi: 'अश्वगंधा', match: /ashwagandha/i },
  { id: 'brahmi', fill: 'brahmi', name: 'Brahmi', hindi: 'ब्राह्मी', match: /brahmi/i },
  { id: 'arjuna', fill: 'arjuna', name: 'Arjun chhaal', english: 'arjuna bark', hindi: 'अर्जुन छाल', match: /arjuna/i },
]

export function ingredientsFor(disease) {
  const text = disease.remedies.join(' ')
  return shelf.filter(item => item.match.test(text))
}

// Every shelf item the library uses, with the conditions that call for it
export const shelfInUse = shelf
  .map(item => ({
    ...item,
    conditions: diseases.filter(d => item.match.test(d.remedies.join(' '))).map(d => d.id),
  }))
  .filter(item => item.conditions.length > 0)

export const totalRemedies = diseases.reduce((sum, d) => sum + d.remedies.length, 0)
