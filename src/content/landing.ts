/**
 * LANDING PAGE COPY (Hinglish). These are the defaults; anything saved in
 * Admin → Landing content overrides a section without a code change.
 * Keep claims honest: no income guarantees, no fake numbers.
 */
export const landingDefaults = {
  hero: {
    eyebrow: "Phone se • Free AI tools se • Hinglish mein",
    headline: "AI se banao viral 'Bhai' reels",
    highlight: "jo log baar baar dekhein",
    subheadline:
      "Lion bhai, tiger don, mafia stories — step-by-step seekho kaise free AI tools se cinematic animal reels banti hain. Bina camera, bina face dikhaye, bina editing experience.",
    ctaText: "Course join karo",
    secondaryCta: "Free lesson dekho",
    videoUrl: "", // short (≤3 MB) muted MP4 sample reel — upload in Admin
    posterUrl: "",
    stats: [
      { value: "40", label: "video lessons" },
      { value: "300+", label: "ready prompts" },
      { value: "₹0", label: "tools ka kharcha" },
    ],
  },
  problem: {
    title: "Kya aapke saath bhi yahi ho raha hai?",
    points: [
      "Viral AI reels dekhte ho, par samajh nahi aata kaise bani",
      "YouTube pe tutorials English mein, adhoore, ya paid tools wale",
      "Character har scene mein alag dikhne lagta hai",
      "Reel ban bhi jaye to views 200 pe atak jaate hain",
      "Pata nahi is skill se paisa kaise banega",
    ],
    answer: "Is course mein poora system ek jagah hai — idea se lekar post karne tak, aur aage kamai tak.",
  },
  earn: {
    title: "Creators is skill se kaise kamate hain",
    items: [
      { icon: "🤝", title: "Brand sponsorships", desc: "Page grow hone pe brands promotion ke liye approach karte hain." },
      { icon: "▶️", title: "Platform monetization", desc: "YouTube Shorts / Facebook ke eligibility rules poore karne pe ad revenue." },
      { icon: "🎬", title: "Client work", desc: "Dusre pages aur businesses ke liye reels bana kar fees." },
      { icon: "📈", title: "Apna page as an asset", desc: "Bada niche page future mein kai tarah se kaam aata hai." },
    ],
    disclaimer:
      "Results vary — koi income guarantee nahi hai. Kamai aapki mehnat, consistency, niche aur platform rules pe depend karti hai. Hum skill aur system sikhate hain, paisa ka vaada nahi karte.",
  },
  howItWorks: {
    title: "Kaise kaam karta hai",
    steps: [
      { title: "Join karo", desc: "UPI se 1 minute mein payment, turant access." },
      { title: "Character banao", desc: "Apna 'Bhai' design karo — prompts ready milenge." },
      { title: "Story likho", desc: "Hook se cliffhanger tak — templates ke saath." },
      { title: "Animate + edit", desc: "Free tools se video, voice aur music — phone pe." },
      { title: "Post + grow", desc: "Posting system, series strategy aur kamai ke raste." },
    ],
  },
  curriculum: {
    title: "Course mein kya hai",
    subtitle: "40 lessons • ~320 minute • 720p • mobile pe dekhne ke liye bana",
  },
  bonuses: {
    title: "Saath mein milega",
    items: [
      { icon: "🧠", title: "300+ Prompt Pack", desc: "Character, scenes, camera moves, emotions — copy-paste ready." },
      { icon: "📘", title: "PDF Guide", desc: "Poora workflow ek jagah, offline padhne ke liye." },
      { icon: "🧩", title: "Story Templates", desc: "Mafia, action, emotional — fill-in-the-blank scripts." },
      { icon: "💰", title: "Income Module", desc: "Rate card, brand pitch DM template, client work basics." },
    ],
  },
  testimonials: {
    title: "Students ke results",
    subtitle: "Real students, real screenshots. Results vary.",
  },
  pricing: {
    title: "Apna plan chuno",
    subtitle: "Ek baar payment • Lifetime access • UPI, cards, netbanking",
  },
  guarantee: {
    title: "7-din no-questions refund",
    text: "Course kharido, pehle 7 din mein dekho. Pasand nahi aaya to WhatsApp pe message karo — poora paisa wapas. Bas itna: refund ke baad course access band ho jaata hai.",
  },
  faq: {
    title: "Aapke sawaal",
    items: [
      { q: "Kya sach mein sab phone se ho jayega?", a: "Haan. Course ka poora workflow Android/iPhone pe dikhaya gaya hai. Laptop ho to aur aasaan hai, par zaroori nahi." },
      { q: "Kya tools free hain?", a: "Haan, hum free tools/free plans use karte hain. Kuch tools ki daily limit hoti hai — course mein uske tareeke bataye gaye hain." },
      { q: "Mujhe editing nahi aati, kya main kar paunga?", a: "Course zero se shuru hota hai. Har step screen recording ke saath hai." },
      { q: "Kya income guarantee hai?", a: "Nahi. Koi bhi honest course guarantee nahi de sakta. Hum skill, system aur kamai ke tareeke sikhate hain — results aapki mehnat pe depend karte hain." },
      { q: "Payment ke baad access kaise milega?", a: "Payment hote hi aapke email pe login link aata hai aur thank-you page se seedha Lesson 1 shuru kar sakte hain." },
      { q: "Kitne devices pe dekh sakte hain?", a: "Ek account ek time pe 2 devices pe login reh sakta hai (jaise phone + laptop)." },
      { q: "Refund kaise milega?", a: "7 din ke andar WhatsApp/email pe message karein. Refund 5–7 working days mein aapke original payment method pe aata hai." },
    ],
  },
  partner: {
    title: "Aapka Instagram page hai?",
    text: "Is niche mein page chalate ho to ReelBhai partner bano. Apne link/coupon se har sale pe commission kamao — dashboard mein live clicks, sales aur earnings dikhte hain.",
    cta: "Partner ke liye apply karo",
  },
  stickyBar: {
    ctaText: "Join karo",
  },
};

export type LandingContent = typeof landingDefaults;
export type LandingSectionKey = keyof LandingContent;
