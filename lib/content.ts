export interface PromptEntry { id: string; prompt: string; answers: string[] }

const banks = {
  lagos: ["you leave home today and arrive next week", "third mainland is a very long parking lot", "the hawkers know my name now", "google maps just says good luck", "one small rain and everybody lives on the road", "your playlist will finish twice before you reach"],
  food: ["jollof with plantain, no long talk", "the one that finishes before i take a picture", "anything hot with extra pepper", "rice that tastes like somebody's auntie made it", "small chops because commitment is scary", "the free food at somebody else's party"],
  work: ["i'm already thinking about lunch", "camera off, spirit present", "one email away from logging out", "the meeting could have been a voice note", "i came for the salary alert", "my best work happens five minutes to deadline"],
  social: ["i will reply in three to five business days", "the group chat already knows everything", "just send a voice note abeg", "i saw it and forgot immediately", "online but emotionally unavailable", "my battery died, allegedly"],
  life: ["sleep first, questions later", "i have a plan but the plan is shy", "soft life with hard deadlines", "somehow vibes keep paying the bills", "tomorrow has better energy", "we move, because what else can we do"],
  school: ["the lecturer said it is simple, so we are finished", "i understood it until the exam started", "group project means one person has a project", "attendance is carrying the whole degree", "the pdf is longer than my attention span", "read all night, remembered the title"],
  culture: ["the aunties have already formed a committee", "music loud enough to solve the problem", "everybody brought one extra person", "five minutes means we have not left home", "the pictures are the real event", "somebody's mum will pack food for everyone"],
  random: ["that depends on who is asking", "i have never recovered honestly", "bold of you to assume i know", "easy answer: absolutely not", "it made sense at the time", "please respect my privacy at this difficult time"]
} as const;

export const prompts: PromptEntry[] = [
  ["p01", "Describe Lagos traffic in one sentence.", "lagos"],
  ["p02", "What food could you eat three days in a row?", "food"],
  ["p03", "What is your most honest work-from-home status?", "work"],
  ["p04", "Give a believable excuse for replying late.", "social"],
  ["p05", "What does your dream soft life look like?", "life"],
  ["p06", "Describe exam week without saying exam.", "school"],
  ["p07", "What always happens at a Nigerian party?", "culture"],
  ["p08", "What is a tiny thing that feels illegal?", "random"],
  ["p09", "What would make you leave a party early?", "social"],
  ["p10", "Name the real first task of every workday.", "work"],
  ["p11", "What is the best part of a wedding?", "culture"],
  ["p12", "Describe your relationship with your alarm.", "life"],
  ["p13", "Which meal deserves its own public holiday?", "food"],
  ["p14", "What is the quickest way to start an argument?", "random"],
  ["p15", "What does 'I'm on my way' really mean?", "culture"],
  ["p16", "Write the title of your current life chapter.", "life"],
  ["p17", "What is your group chat famous for?", "social"],
  ["p18", "Describe your lecturer in five words.", "school"],
  ["p19", "What would you buy first with surprise money?", "life"],
  ["p20", "What is the most suspicious office phrase?", "work"],
  ["p21", "Which snack disappears fastest in your house?", "food"],
  ["p22", "What is your unpopular food opinion?", "food"],
  ["p23", "Describe Monday morning as a movie.", "work"],
  ["p24", "What should never be a voice note?", "social"],
  ["p25", "What is the unofficial rule of group projects?", "school"],
  ["p26", "What is guaranteed to happen when it rains?", "lagos"],
  ["p27", "What is the best excuse to cancel plans?", "social"],
  ["p28", "Describe adulthood using a food.", "food"],
  ["p29", "What is your phone battery trying to tell you?", "random"],
  ["p30", "What deserves a standing ovation?", "random"],
  ["p31", "What is a sign the party is actually good?", "culture"],
  ["p32", "What do you pretend to understand?", "random"],
  ["p33", "Describe your bank account after the weekend.", "life"],
  ["p34", "What is the first lie told in a meeting?", "work"],
  ["p35", "What makes a long queue worth it?", "food"],
  ["p36", "What belongs in every student survival kit?", "school"],
  ["p37", "What is the real purpose of family WhatsApp?", "culture"],
  ["p38", "What would your search history say about you?", "random"],
  ["p39", "Describe public transport in one sentence.", "lagos"],
  ["p40", "What is the best feeling after a long day?", "life"]
].map(([id, prompt, bank]) => ({ id, prompt, answers: [...banks[bank as keyof typeof banks]] }));

export function promptForRound(code: string, round: number): PromptEntry {
  const seed = [...code].reduce((n, char) => n + char.charCodeAt(0), 0);
  return prompts[(seed + round * 11) % prompts.length];
}
