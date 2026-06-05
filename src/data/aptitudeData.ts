export interface AptitudeSubject {
  id: string
  title: string
  icon: string
  color: string
  description: string
  topics: string[]
  keyPoints: string[]
  estimatedTime: number // minutes
}

export interface AptitudeConcept {
  id: string
  subjectId: string
  title: string
  description: string
  keyPoints: string[]
  order: number
}

export const APTITUDE_SUBJECTS: AptitudeSubject[] = [
  {
    id: 'quantitative',
    title: 'Quantitative Aptitude',
    icon: '????',
    color: '#3B82F6',
    description: 'Master numbers, percentages, ratios, profit-loss, time-distance, averages, and probability -- the backbone of placement tests.',
    topics: ['Percentages', 'Ratios & Proportions', 'Profit & Loss', 'Time, Speed & Distance', 'Averages', 'Simple & Compound Interest', 'Number Systems', 'Probability', 'Permutation & Combination', 'Mixtures & Alligations'],
    keyPoints: [
      'Percentage change formula: (New - Old)/Old x 100',
      'SI = PRT/100, CI = P(1+R/100)^T - P',
      'Speed = Distance/Time; all units must match',
      'Profit% = (Profit/CP) x 100',
      'nPr = n!/(n-r)!, nCr = n!/[r!(n-r)!]',
    ],
    estimatedTime: 60,
  },
  {
    id: 'verbal',
    title: 'Verbal Ability',
    icon: '????',
    color: '#10B981',
    description: 'Boost your English language skills -- vocabulary, grammar, reading comprehension, sentence completion, and verbal reasoning.',
    topics: ['Synonyms & Antonyms', 'Sentence Completion', 'Reading Comprehension', 'Error Spotting', 'Sentence Rearrangement', 'Idioms & Phrases', 'One Word Substitution', 'Cloze Test', 'Active & Passive Voice', 'Direct & Indirect Speech'],
    keyPoints: [
      'Context clues help determine word meaning',
      'Active: subject acts; Passive: subject is acted upon',
      'Main idea vs supporting detail in comprehension',
      'Identify error type: grammar, spelling, usage',
      'Paraphrase sentences before answering',
    ],
    estimatedTime: 45,
  },
  {
    id: 'logical',
    title: 'Logical Reasoning',
    icon: '????',
    color: '#8B5CF6',
    description: 'Sharpen your analytical thinking -- series, coding-decoding, blood relations, seating arrangements, syllogisms, and more.',
    topics: ['Number & Letter Series', 'Coding-Decoding', 'Blood Relations', 'Seating Arrangements', 'Syllogisms', 'Direction & Distance', 'Statements & Conclusions', 'Analogy', 'Classification', 'Clocks & Calendars'],
    keyPoints: [
      'In series: find the pattern (arithmetic/geometric/mixed)',
      'Coding: apply same operation to decode',
      'Blood relations: draw a family tree diagram',
      'Syllogism: use Venn diagrams to check validity',
      'Directions: always reset reference to North',
    ],
    estimatedTime: 50,
  },
  {
    id: 'data_interpretation',
    title: 'Data Interpretation',
    icon: '????',
    color: '#F59E0B',
    description: 'Read and interpret tables, bar charts, pie charts, line graphs, and mixed diagrams quickly and accurately.',
    topics: ['Bar Charts', 'Pie Charts', 'Line Graphs', 'Tables', 'Mixed Graphs', 'Caselet DI', 'Data Sufficiency', 'Missing Data'],
    keyPoints: [
      'Read the title, axes, and legend before answering',
      'Estimate when exact values are hard to read',
      'Pie chart: value = (angle/360) x total',
      'Compare trends across multiple series',
      'Caselet: extract all numeric data first',
    ],
    estimatedTime: 45,
  },
  {
    id: 'technical_aptitude',
    title: 'Technical Aptitude',
    icon: '????',
    color: '#EF4444',
    description: 'Core CS concepts tested in tech placements -- OS, DBMS, networking, data structures, algorithms, and OOP fundamentals.',
    topics: ['Data Structures', 'Algorithms & Complexity', 'DBMS & SQL', 'OS Concepts', 'Networking Basics', 'OOP Concepts', 'Computer Organization', 'Software Engineering'],
    keyPoints: [
      'Big-O: O(1) < O(log n) < O(n) < O(n log n) < O(n^2)',
      'Stack: LIFO, Queue: FIFO',
      'SQL JOIN types: INNER, LEFT, RIGHT, FULL',
      'Process states: New -> Ready -> Running -> Wait -> Terminated',
      'OSI model: 7 layers from Physical to Application',
    ],
    estimatedTime: 60,
  },
]

export const APTITUDE_CONCEPTS: Record<string, AptitudeConcept[]> = {
  quantitative: [
    { id: 'apt_quant_percentage', subjectId: 'quantitative', title: 'Percentages & Applications', description: 'Percentage calculation, percentage change, successive percentage change, and real-world applications.', keyPoints: ['Percentage = (Part/Whole) x 100', 'Increase by x% then decrease by y%: net = x - y - xy/100', 'Successive discount formula', 'Percentage point vs percentage change'], order: 1 },
    { id: 'apt_quant_ratio', subjectId: 'quantitative', title: 'Ratios, Proportions & Variation', description: 'Understanding ratios, proportionality, and direct/inverse variation in problem-solving.', keyPoints: ['a:b = a/b', 'If a:b = c:d then ad = bc (cross multiplication)', 'Direct variation: y = kx', 'Inverse variation: xy = k'], order: 2 },
    { id: 'apt_quant_profit', subjectId: 'quantitative', title: 'Profit, Loss & Discount', description: 'Cost price, selling price, profit/loss percentage, discounts, marked price, and successive discounts.', keyPoints: ['Profit = SP - CP', 'Loss% = (Loss/CP) x 100', 'Discount% = (Discount/MP) x 100', 'SP = MP x (1 - d/100)'], order: 3 },
    { id: 'apt_quant_tsd', subjectId: 'quantitative', title: 'Time, Speed & Distance', description: 'Speed-distance-time relationship, relative speed, trains, boats & streams problems.', keyPoints: ['D = S x T', 'Relative speed (same dir): |s1-s2|', 'Relative speed (opposite): s1+s2', 'Boat upstream: s - u; downstream: s + u'], order: 4 },
    { id: 'apt_quant_interest', subjectId: 'quantitative', title: 'Simple & Compound Interest', description: 'SI and CI formulas, EMI basics, doubling time, effective interest rate.', keyPoints: ['SI = PRT/100', 'CI = P[(1+R/100)^T - 1]', 'Doubling time (rule of 72): 72/R years', 'CI > SI for same P, R, T when T > 1'], order: 5 },
    { id: 'apt_quant_averages', subjectId: 'quantitative', title: 'Averages, Mixtures & Alligations', description: 'Mean, weighted average, alligation rule for mixture problems.', keyPoints: ['Average = Sum / n', 'Weighted avg: Sigma(w???x???)/Sigmaw???', 'Alligation cross method', 'If avg increases/decreases, find the new/removed element'], order: 6 },
    { id: 'apt_quant_pnc', subjectId: 'quantitative', title: 'Probability, Permutations & Combinations', description: 'Counting principles, P&C formulas, and basic probability for placement-level problems.', keyPoints: ['nPr = n!/(n-r)!', 'nCr = n!/[r!(n-r)!]', 'P(A) = favorable / total outcomes', 'P(AUB) = P(A) + P(B) - P(A^B)'], order: 7 },
  ],
  verbal: [
    { id: 'apt_verbal_vocab', subjectId: 'verbal', title: 'Vocabulary -- Synonyms & Antonyms', description: 'Build a strong vocabulary base for placement tests with common synonyms, antonyms, and context clues.', keyPoints: ['Use roots, prefixes, suffixes to decode unknown words', 'Context clues: definition, example, contrast, inference', 'Common negative prefixes: un-, in-, dis-, non-', 'Common roots: bene (good), mal (bad), port (carry)'], order: 1 },
    { id: 'apt_verbal_grammar', subjectId: 'verbal', title: 'Grammar & Error Spotting', description: 'Subject-verb agreement, tenses, articles, prepositions, and spotting grammatical errors in sentences.', keyPoints: ['Subject-verb agreement: singular subject -> singular verb', 'Collective nouns take singular verb', 'Article usage: a (consonant sound), an (vowel sound), the (specific)', 'Prepositions: at (point), in (enclosed), on (surface)'], order: 2 },
    { id: 'apt_verbal_comprehension', subjectId: 'verbal', title: 'Reading Comprehension', description: 'Strategies to quickly read, understand, and answer questions on passages in placement tests.', keyPoints: ['Skim -> read questions -> scan for answers', 'Main idea is usually in the first or last sentence of the passage', 'Inference vs stated fact distinction', 'Eliminate options with extreme words: always, never, all, none'], order: 3 },
    { id: 'apt_verbal_sentence', subjectId: 'verbal', title: 'Sentence Completion & Para-Jumbles', description: 'Fill-in-the-blank sentences and rearranging jumbled paragraphs into logical order.', keyPoints: ['Look for discourse markers: however, therefore, moreover, thus', 'Topic sentence introduces the main idea', 'Pronouns must refer to a clearly stated noun before them', 'Para-jumbles: find the mandatory first and last sentences first'], order: 4 },
  ],
  logical: [
    { id: 'apt_logical_series', subjectId: 'logical', title: 'Number & Letter Series', description: 'Identify patterns in number and letter sequences -- arithmetic, geometric, and mixed series.', keyPoints: ['Arithmetic series: common difference d = a2-a1', 'Geometric series: common ratio r = a2/a1', 'Difference series: compute differences repeatedly', 'Fibonacci-type: each term = sum of previous two'], order: 1 },
    { id: 'apt_logical_coding', subjectId: 'logical', title: 'Coding-Decoding', description: 'Letter, number, and symbol substitution coding problems frequently asked in placements.', keyPoints: ['Forward/backward alphabet position coding', 'Shift by constant: A->D means +3 shift', 'Opposite letter: A<->Z, B<->Y etc.', 'Number-letter: A=1, B=2 ... Z=26'], order: 2 },
    { id: 'apt_logical_syllogism', subjectId: 'logical', title: 'Syllogisms & Venn Diagrams', description: 'Logical deduction using statements, conclusions, and Venn diagram representations.', keyPoints: ['All A are B -> draw A inside B', 'No A is B -> A and B circles do not overlap', 'Some A are B -> A and B partially overlap', 'Draw all possible diagrams before choosing conclusion'], order: 3 },
    { id: 'apt_logical_arrangement', subjectId: 'logical', title: 'Seating Arrangements & Puzzles', description: 'Linear, circular, and matrix-based arrangement problems with complex constraints.', keyPoints: ['Start with definite/fixed positions', 'Circular: fix one person, arrange others relatively', 'Draw table/diagram for all constraints', 'Use process of elimination for contradictions'], order: 4 },
    { id: 'apt_logical_directions', subjectId: 'logical', title: 'Direction & Distance + Blood Relations', description: 'Navigation direction problems and family relationship questions solved systematically.', keyPoints: ['Compass: N top, S bottom, E right, W left', 'After turning right: face new direction accordingly', 'Blood relations: draw family tree step by step', 'Key: mother/father of a child means that person is the grandparent'], order: 5 },
  ],
  data_interpretation: [
    { id: 'apt_di_tables', subjectId: 'data_interpretation', title: 'Tables & Data Extraction', description: 'Read tabular data accurately and answer percentage, ratio, and comparison questions.', keyPoints: ['Read row/column labels carefully', 'Note units at the top/bottom', 'Row total vs column total distinction', 'Percentage of a row value = (cell/row total) x 100'], order: 1 },
    { id: 'apt_di_charts', subjectId: 'data_interpretation', title: 'Bar & Pie Charts', description: 'Interpret bar graphs (simple, stacked, grouped) and pie charts in placement DI sets.', keyPoints: ['Bar height = value; compare bars visually first', 'Pie chart: angle/360 x total = value', 'Stacked bar: segment length = category value', 'Always check the scale on both axes'], order: 2 },
    { id: 'apt_di_line', subjectId: 'data_interpretation', title: 'Line Graphs & Mixed Charts', description: 'Trend analysis, rate of change, and mixed chart interpretation strategies.', keyPoints: ['Steeper slope = faster rate of change', 'Intersection point: two quantities are equal', 'Mixed chart: read each chart type independently', '% change = (end - start)/start x 100'], order: 3 },
  ],
  technical_aptitude: [
    { id: 'apt_tech_dsa', subjectId: 'technical_aptitude', title: 'Data Structures & Algorithms', description: 'Arrays, linked lists, stacks, queues, trees, sorting, searching -- complexity analysis.', keyPoints: ['Array: O(1) access, O(n) insert', 'Binary search: O(log n), requires sorted array', 'Quick sort avg O(n log n), worst O(n^2)', 'BFS uses queue, DFS uses stack/recursion'], order: 1 },
    { id: 'apt_tech_dbms', subjectId: 'technical_aptitude', title: 'DBMS & SQL Queries', description: 'Relational database concepts, normalization, SQL queries, joins, and transactions.', keyPoints: ['SELECT, WHERE, GROUP BY, HAVING, ORDER BY sequence', 'INNER JOIN: only matching rows', 'LEFT JOIN: all left + matching right', '1NF, 2NF, 3NF normalization rules'], order: 2 },
    { id: 'apt_tech_os', subjectId: 'technical_aptitude', title: 'Operating Systems & Networking', description: 'Process management, memory, deadlock, scheduling algorithms, and OSI model basics.', keyPoints: ['Deadlock: mutual exclusion, hold-wait, no preemption, circular wait', 'FCFS, SJF, Round Robin scheduling', 'Virtual memory: pages + page table', 'OSI 7 layers: Physical->Data Link->Network->Transport->Session->Presentation->Application'], order: 3 },
    { id: 'apt_tech_oop', subjectId: 'technical_aptitude', title: 'OOP & Software Concepts', description: 'Encapsulation, inheritance, polymorphism, abstraction, SOLID principles, and design patterns.', keyPoints: ['Encapsulation: bundle data + methods', 'Inheritance: IS-A relationship', 'Polymorphism: same method, different behavior', 'Abstract class vs interface distinction'], order: 4 },
  ],
}
