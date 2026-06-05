'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useStrictClipboardGuard } from '@/hooks/useStrictClipboardGuard'
import { AIChat } from '@/components/learning/AIChat'
import { StageProgress } from '@/components/learning/StageProgress'
import { ProctoringOverlay } from '@/components/exam/ProctoringOverlay'
import { aiService } from '@/lib/ai/aiService'
import { markStageComplete, saveLearningAnalytics } from '@/lib/firebase/firestore'
import { computeLearningEffectivenessScore, isMeaningfulLearningMessage } from '@/lib/learningMetrics'
import type { ChatMessage } from '@/types'

const CONCEPTS_MAP: Record<string, { title: string; languageId: string; keyPoints: string[] }> = {
  // JavaScript
  js_intro: {
    title: 'Introduction to JavaScript',
    languageId: 'javascript',
    keyPoints: ['JS runs in browsers AND Node.js', 'Link with <script src="file.js" defer></script>', 'console.log() for output', 'JS is case-sensitive and dynamically typed', 'Interpreted -- no compile step; errors show at runtime'],
  },
  js_variables: {
    title: 'Variables -- var, let & const',
    languageId: 'javascript',
    keyPoints: ['Use const by default; let when you need to reassign', 'let/const have block scope {}; var has function scope (avoid var)', 'Hoisting: var is moved to top as undefined; let/const are not', 'camelCase for variables, UPPER_SNAKE for constants', 'const objects/arrays can still have their contents changed'],
  },
  js_datatypes: {
    title: 'Data Types & Type Coercion',
    languageId: 'javascript',
    keyPoints: ['7 primitives: Number, String, Boolean, undefined, null, Symbol, BigInt', 'typeof null returns "object" -- a famous JS bug', 'Always use === not == to avoid type coercion surprises', '"5" + 2 = "52" (string wins); "5" - 2 = 3 (math wins)', 'Falsy: 0, "", null, undefined, NaN, false -- everything else is truthy'],
  },
  js_operators: {
    title: 'Operators & Expressions',
    languageId: 'javascript',
    keyPoints: ['JS division always returns float: 10/3 = 3.333', 'Always use === and !== -- never == (it coerces types)', '?? (nullish coalescing): only falls back for null/undefined, not 0 or ""', '?. (optional chaining): safe property access without errors', 'Ternary: condition ? valueIfTrue : valueIfFalse'],
  },
  js_control_flow: {
    title: 'Control Flow -- if, switch & Ternary',
    languageId: 'javascript',
    keyPoints: ['Always use curly braces {} in if/else', 'switch needs break after each case or execution falls through', 'Falsy: false, 0, "", null, undefined, NaN', 'Ternary for simple conditions only; nested ternaries hurt readability', 'Use && as a guard: condition && doSomething()'],
  },
  js_loops: {
    title: 'Loops -- for, while, for...of & for...in',
    languageId: 'javascript',
    keyPoints: ['for: use when iteration count is known', 'for...of: cleanest way to loop over array values', 'for...in: loops over object KEYS', 'do...while guarantees at least one execution', 'break exits loop; continue skips to next iteration'],
  },
  js_functions: {
    title: 'Functions & Arrow Functions',
    languageId: 'javascript',
    keyPoints: ['Declarations are hoisted; expressions and arrows are not', 'Arrow functions have no own this -- use regular functions for object methods', 'Default params: function greet(name = "Student") {}', 'Rest params (...args) collect extra args into an array', 'Closures: inner functions remember outer variables even after outer returns'],
  },
  js_arrays: {
    title: 'Arrays & Array Methods',
    languageId: 'javascript',
    keyPoints: ['map() transforms each element -> returns a NEW array', 'filter() keeps matching elements -> returns a NEW array', 'reduce() accumulates all elements -> returns a single value', 'push/pop modify END; unshift/shift modify START', 'splice() mutates original; slice() returns a copy'],
  },
  js_objects: {
    title: 'Objects, Methods & JSON',
    languageId: 'javascript',
    keyPoints: ['Dot notation (obj.key) for known keys; bracket (obj["key"]) for dynamic', 'Methods use this; arrow functions lack own this (avoid for methods)', 'Destructuring: const { name, age } = person', 'Spread copies properties: const copy = { ...original, newKey: val }', 'JSON.stringify() converts object->string; JSON.parse() converts back'],
  },
  js_strings: {
    title: 'Strings & Template Literals',
    languageId: 'javascript',
    keyPoints: ['Template literals: `Hello ${name}!` -- embed any expression', 'Strings are immutable -- methods return new strings', 'slice(start, end) supports negative indices; substring() does not', 'split() converts string->array; join() converts array->string', 'trim() removes whitespace; includes() checks for substrings'],
  },
  js_dom: {
    title: 'DOM Manipulation',
    languageId: 'javascript',
    keyPoints: ['querySelector() returns first match; querySelectorAll() returns all', 'textContent sets plain text (safe); innerHTML sets HTML (risky with user input)', 'classList.add/remove/toggle manages CSS classes', 'createElement() + appendChild() adds dynamic content safely', 'dataset gives access to data-* attributes: element.dataset.userId'],
  },
  js_events: {
    title: 'Events & Event Listeners',
    languageId: 'javascript',
    keyPoints: ['addEventListener(type, handler) preferred over onclick= attributes', 'e.preventDefault() stops the default browser action', 'Events bubble UP from child to parent -- stopPropagation() stops it', 'Event delegation: listen on parent to handle all child events', 'DOMContentLoaded fires when HTML parsed; load fires after all resources load'],
  },
  js_es6: {
    title: 'ES6+ Modern Features',
    languageId: 'javascript',
    keyPoints: ['Destructuring extracts values from arrays/objects in one line', 'Spread (...) EXPANDS; Rest (...) COLLECTS remaining items', 'Classes are syntactic sugar -- JS still uses prototype-based inheritance', 'import/export enables modular code -- use type="module" in script tag', 'Optional chaining (?.) and nullish coalescing (??) for safe access'],
  },
  js_async: {
    title: 'Async JavaScript -- Promises & async/await',
    languageId: 'javascript',
    keyPoints: ['JS is single-threaded; async ops handled via the event loop', 'async/await is syntactic sugar over Promises -- use try/catch', 'Promise.all() runs tasks in parallel (faster); sequential await runs one by one', 'await only works inside async functions', 'Microtasks (Promise .then) run before macrotasks (setTimeout)'],
  },
  js_error_handling: {
    title: 'Error Handling & Debugging',
    languageId: 'javascript',
    keyPoints: ['try/catch/finally: try = risky code, catch = handle error, finally = always runs', 'throw creates an error; instanceof checks which type was caught', 'Create custom error classes extending Error for domain errors', 'Re-throw errors you cannot handle: throw e inside catch', 'console.table(), console.time(), and debugger statement for DevTools'],
  },
  // Python -- SASTRA Syllabus
  python_intro: {
    title: 'Introduction to Python',
    languageId: 'python',
    keyPoints: ['Python is interpreted -- no compilation needed', 'print() for output, input() for input', 'Identifiers: case-sensitive, no keywords', 'Indentation defines code blocks', 'Run with: python3 filename.py'],
  },
  variables: {
    title: 'Variables & Data Types',
    languageId: 'python',
    keyPoints: ['Variables are created by assignment', 'Types: int, float, str, bool', 'Use type() to check the type', 'Type conversion: int(), float(), str()', 'Python is dynamically typed'],
  },
  operators: {
    title: 'Operators in Python',
    languageId: 'python',
    keyPoints: ['// floor division, % modulo, ** power', 'Comparison operators return True/False', 'Logical: and, or, not', 'Assignment: +=, -=, *=, /=', 'Membership: in, not in'],
  },
  control_flow: {
    title: 'Decision Control Structures',
    languageId: 'python',
    keyPoints: ['if / elif / else for conditions', 'Indentation (4 spaces) defines blocks', 'Ternary: value = x if cond else y', '0, "", [], {} are Falsy', 'Nested if statements are supported'],
  },
  loops: {
    title: 'Loops (for & while)',
    languageId: 'python',
    keyPoints: ['for loop iterates over sequences', 'range(start, stop, step) generates numbers', 'while runs while condition is True', 'break exits; continue skips iteration', 'else clause runs when loop ends normally'],
  },
  functions: {
    title: 'Functions',
    languageId: 'python',
    keyPoints: ['def defines a function', 'Default parameters make args optional', '*args: variable positional arguments', '**kwargs: variable keyword arguments', 'Lambda: small anonymous function'],
  },
  modules: {
    title: 'Modules & Packages',
    languageId: 'python',
    keyPoints: ['import loads a module', 'from module import name for specific items', 'Alias: import numpy as np', 'Standard library: os, sys, math, json, re', 'pip installs third-party packages'],
  },
  file_handling: {
    title: 'File Input/Output',
    languageId: 'python',
    keyPoints: ['with open() auto-closes the file', 'read() gets whole file; readlines() gets list', '"w" overwrites; "a" appends; "r" reads', 'Binary mode: "rb" / "wb"', 'os.path.exists() checks if file exists'],
  },
  exception_handling: {
    title: 'Exception Handling',
    languageId: 'python',
    keyPoints: ['try contains risky code; except handles error', 'except ExceptionType for specific errors', 'else runs only if no exception occurred', 'finally always runs -- use for cleanup', 'raise throws your own exceptions'],
  },
  dictionaries: {
    title: 'Dictionaries',
    languageId: 'python',
    keyPoints: ['Dictionaries store key: value pairs', 'Keys must be unique and immutable', '.get() avoids KeyError on missing keys', '.keys(), .values(), .items() iterate', 'Dict comprehension: {k: v for k,v in ...}'],
  },
  oop: {
    title: 'Object-Oriented Programming',
    languageId: 'python',
    keyPoints: ['__init__ is the constructor', 'self refers to the current instance', 'Class vs instance attributes', 'Inheritance: child extends parent class', 'super() calls the parent method'],
  },
  internet_client: {
    title: 'Internet Client Programming',
    languageId: 'python',
    keyPoints: ['urllib.request: built-in HTTP module', 'requests library: pip install requests', 'response.status_code: 200=OK, 404=Not Found', 'response.json() parses the JSON body', 'json.loads() string->dict; json.dumps() dict->string'],
  },
  web_client: {
    title: 'Web Clients & Servers',
    languageId: 'python',
    keyPoints: ['HTTP: request/response protocol', 'GET retrieves; POST sends data', 'http.server creates a dev web server', 'Headers carry metadata (content-type, auth)', 'Modern apps use Flask or Django'],
  },
  django: {
    title: 'Django Web Framework',
    languageId: 'python',
    keyPoints: ['MVT: Model-View-Template architecture', 'Models define database tables in Python', 'Views handle requests and return responses', 'Templates: HTML with Django template tags', 'urls.py maps URLs to view functions'],
  },
  // C -- SASTRA Syllabus
  c_intro: {
    title: 'Introduction to C & Algorithms',
    languageId: 'c',
    keyPoints: ['Every C program starts at main()', '#include adds header files', 'printf for output; scanf for input', 'Algorithm: finite step-by-step solution', 'Compile: gcc program.c -o program'],
  },
  c_variables: {
    title: 'Data Types & Variables in C',
    languageId: 'c',
    keyPoints: ['C requires explicit type declarations', 'int, float, double, char data types', 'const and #define create constants', 'sizeof() returns type size in bytes', 'Type casting: (int)3.99 truncates to 3'],
  },
  c_operators: {
    title: 'Operators in C',
    languageId: 'c',
    keyPoints: ['Integer division 5/2 = 2 (truncates)', '% gives the remainder', '++x pre-increment; x++ post-increment', '&&, ||, ! are logical operators', 'Ternary: condition ? value_true : value_false'],
  },
  c_control_flow: {
    title: 'Decision Control Structures in C',
    languageId: 'c',
    keyPoints: ['if / else if / else for conditions', 'Curly braces {} define code blocks', 'switch for discrete value matching', 'break prevents switch fall-through', 'default handles unmatched switch cases'],
  },
  c_loops: {
    title: 'Loops in C',
    languageId: 'c',
    keyPoints: ['for: init; condition; update', 'while: condition-driven repetition', 'do-while: runs at least once', 'break exits; continue skips iteration', 'Nested loops for tables and matrices'],
  },
  c_functions: {
    title: 'Functions in C',
    languageId: 'c',
    keyPoints: ['Prototype declares function before use', 'void = no return value', 'C is pass-by-value by default', 'Pass pointer (&var) to modify original', 'Recursive functions must have a base case'],
  },
  c_arrays: {
    title: 'Arrays in C',
    languageId: 'c',
    keyPoints: ['Arrays store same-type data contiguously', 'Indexing starts at 0', 'Size is fixed at declaration', 'C does not check array bounds!', '2D arrays: matrix[row][col]'],
  },
  c_strings: {
    title: 'Strings in C',
    languageId: 'c',
    keyPoints: ['Strings are char arrays ending with \\0', 'strlen() does not count the null terminator', 'strcpy copies; strcat appends; strcmp compares', 'fgets() is safer than scanf() for strings', 'Destination must be large enough for the string'],
  },
  c_structures: {
    title: 'Structures & Unions in C',
    languageId: 'c',
    keyPoints: ['struct groups different data types', 'Access members with dot (.) operator', 'typedef creates shorter alias for struct', 'Arrow (->) for struct pointer access', 'union members share the same memory'],
  },
  c_pointers: {
    title: 'Pointers in C',
    languageId: 'c',
    keyPoints: ['& gets address; * dereferences pointer', 'Always initialize pointers to NULL', 'malloc() allocates heap memory', 'Always free() to avoid memory leaks', 'Pointer arithmetic moves by type size'],
  },
  c_files: {
    title: 'File Handling in C',
    languageId: 'c',
    keyPoints: ['fopen() returns NULL on failure -- always check!', 'fprintf writes; fgets reads lines safely', 'Always call fclose() when done', '"w" overwrites; "a" appends; "r" reads', 'Binary files use "rb"/"wb" modes'],
  },
  // C++ -- SASTRA Syllabus
  cpp_oop_intro: {
    title: 'OOP Introduction & Principles',
    languageId: 'cpp',
    keyPoints: ['OOP organizes code as interacting objects', 'Encapsulation: bundle data + hide internals', 'Inheritance: child reuses parent class', 'Polymorphism: same name, different behavior', 'Abstraction: hide complexity, show interface'],
  },
  cpp_basics: {
    title: 'C++ Basics & I/O',
    languageId: 'cpp',
    keyPoints: ['cout << for output; cin >> for input', 'using namespace std avoids std:: prefix', 'string class: .length(), .substr(), +, ==', 'getline(cin, str) reads full line', 'static_cast<type>() is preferred C++ cast'],
  },
  cpp_functions: {
    title: 'Functions in C++',
    languageId: 'cpp',
    keyPoints: ['Function overloading: same name, different params', 'Default arguments must be at the end', 'inline: compiler replaces call with code body', 'Call by reference (int &a) modifies original', 'C++ references are cleaner than pointers'],
  },
  cpp_classes: {
    title: 'Classes & Objects in C++',
    languageId: 'cpp',
    keyPoints: ['private members only accessible in class', 'Constructor: same name as class, no return type', 'Destructor ~ClassName: called on object destroy', 'const methods do not modify the object', 'static members shared across all instances'],
  },
  cpp_arrays_strings: {
    title: 'Arrays & Strings in C++',
    languageId: 'cpp',
    keyPoints: ['C++ string class is safer than char arrays', 'string supports +, ==, !=, < operators directly', '.find() and .substr() for string operations', 'vector is a dynamic array with push_back()', 'Range-based for: for (x : container)'],
  },
  cpp_templates: {
    title: 'Templates in C++',
    languageId: 'cpp',
    keyPoints: ['Templates enable generic programming', 'typename T is a type placeholder', 'Compiler generates code for each type used', 'Class templates create generic data structures', 'Template specialization for specific types'],
  },
  cpp_operator_overloading: {
    title: 'Operator Overloading',
    languageId: 'cpp',
    keyPoints: ['Gives custom meaning to operators for classes', 'Syntax: return_type operator+(const T& other)', 'friend functions access private members', 'operator<< and >> for cout/cin I/O', 'Cannot overload ::, ., .*, sizeof, typeid'],
  },
  cpp_inheritance: {
    title: 'Inheritance in C++',
    languageId: 'cpp',
    keyPoints: ['public inheritance = "is-a" relationship', 'Child constructor calls parent via : Parent()', 'protected: accessible in derived, not outside', 'virtual + override for runtime polymorphism', 'Multiple inheritance: class C : public A, public B'],
  },
  cpp_memory: {
    title: 'Memory Management in C++',
    languageId: 'cpp',
    keyPoints: ['new allocates heap memory; delete frees it', 'Use delete[] for arrays allocated with new[]', 'Memory leak: forget delete -> RAM fills up', 'Dangling pointer: using pointer after delete', 'Smart pointers auto-manage memory (no manual delete)'],
  },
  cpp_virtual: {
    title: 'Virtual Functions & Polymorphism',
    languageId: 'cpp',
    keyPoints: ['virtual: base declares, derived overrides', 'Pure virtual (= 0): derived MUST override', 'Abstract class: has at least one pure virtual', 'Base pointer calls correct derived method (runtime)', 'Always virtual destructor in base class'],
  },
  cpp_streams: {
    title: 'Streams & File Handling in C++',
    languageId: 'cpp',
    keyPoints: ['ifstream reads; ofstream writes; fstream both', 'Check if (!file) after opening', 'Always call .close() when done', 'getline() reads full lines from files', 'ios::binary for binary file mode'],
  },
  // Java -- SASTRA Syllabus
  java_intro: {
    title: 'Introduction to Java',
    languageId: 'java',
    keyPoints: ['Java created by James Gosling at Sun Microsystems in 1995', 'Write Once, Run Anywhere -- JVM executes on any platform', 'JDK compiles code; JVM runs the bytecode (.class file)', 'Every Java program has a main method as entry point', 'Java is strongly typed, object-oriented, and memory-safe'],
  },
  java_datatypes: {
    title: 'Data Types, Variables & Arrays',
    languageId: 'java',
    keyPoints: ['Primitive types: byte, short, int, long, float, double, char, boolean', 'Variables must be declared with a type before use', 'Type casting: (int)3.99 truncates to 3', 'Arrays are fixed-size, same-type, zero-indexed collections', '2D arrays: int[rows][cols] for matrices and tables'],
  },
  java_operators: {
    title: 'Operators & Expressions',
    languageId: 'java',
    keyPoints: ['Integer division: 10/3 = 3, not 3.33 -- use double for decimals', '% gives remainder: 10%3 = 1 (modulo)', 'Pre-increment (++x) vs post-increment (x++)', 'Logical: && (AND), || (OR), ! (NOT)', 'Ternary: condition ? valueIfTrue : valueIfFalse'],
  },
  java_control: {
    title: 'Control Statements',
    languageId: 'java',
    keyPoints: ['if / else if / else for conditional branching', 'switch-case for matching discrete values -- always use break!', 'for loop: best when number of iterations is known', 'while loop: runs while condition is true (may run 0 times)', 'do-while: guaranteed to run at least once'],
  },
  java_classes: {
    title: 'Methods & Classes',
    languageId: 'java',
    keyPoints: ['Class is a blueprint; object is an instance created with new', 'Constructor has the same name as class and no return type', 'this refers to the current object instance', 'Encapsulation: private fields + public getters/setters', 'static members belong to the class, not individual objects'],
  },
  java_interfaces: {
    title: 'Interfaces & Packages',
    languageId: 'java',
    keyPoints: ['Interface is a pure contract -- defines what to do, not how', 'A class implements an interface using the implements keyword', 'A class can implement multiple interfaces (unlike inheritance)', 'Packages group related classes -- like folders for .java files', 'import statement brings classes from other packages into scope'],
  },
  java_exceptions: {
    title: 'Exception Handling',
    languageId: 'java',
    keyPoints: ['try block contains risky code; catch handles specific exceptions', 'finally block always runs -- ideal for closing resources', 'Checked exceptions must be caught or declared with throws', 'RuntimeExceptions (unchecked) are optional to catch', 'Custom exceptions extend the Exception class'],
  },
  java_threads: {
    title: 'Multithreaded Programming',
    languageId: 'java',
    keyPoints: ['A thread is a lightweight sub-process running concurrently', 'Create threads by extending Thread or implementing Runnable', 'Call start() not run() -- start() creates a new thread', 'Thread priorities: MIN(1) to MAX(10); NORM is 5', 'synchronized keyword prevents race conditions on shared data'],
  },
  java_io: {
    title: 'I/O Basics & String Handling',
    languageId: 'java',
    keyPoints: ['Scanner reads input from console -- sc.nextInt(), sc.nextLine()', 'String is immutable -- every operation creates a new String object', 'Common String methods: length(), charAt(), substring(), contains(), split()', 'StringBuffer is mutable -- use for repeated string modifications', 'StringBuffer.append() is faster than String + String in loops'],
  },
  java_collections: {
    title: 'Collections Framework',
    languageId: 'java',
    keyPoints: ['List (ArrayList/LinkedList): ordered, allows duplicates', 'Set (HashSet/TreeSet): no duplicates; TreeSet is always sorted', 'Map (HashMap/TreeMap): key-value pairs; TreeMap sorts by key', 'ArrayList: fast random access; LinkedList: fast insert/delete at ends', 'Comparator allows custom sorting logic for any collection'],
  },
  java_events: {
    title: 'Event Handling',
    languageId: 'java',
    keyPoints: ['Delegation model: Event Source generates event -> Listener handles it', 'Register listener with addActionListener() / addMouseListener()', 'Implement the Listener interface to handle specific events', 'Adapter classes (MouseAdapter) provide empty implementations', 'Anonymous inner classes are a concise way to write one-time listeners'],
  },
  java_swing: {
    title: 'GUI Programming with Swing',
    languageId: 'java',
    keyPoints: ['Swing is part of javax.swing -- lightweight, platform-independent GUI toolkit', 'JFrame is the main window; set size, layout, and close operation', 'Common components: JLabel, JTextField, JButton, JCheckBox, JComboBox', 'Layouts: FlowLayout, BorderLayout (5 regions), GridLayout (rows x cols)', 'JMenuBar -> JMenu -> JMenuItem builds the menu hierarchy'],
  },
}

function getConceptData(id: string) {
  return CONCEPTS_MAP[id] || { title: `Concept: ${id}`, languageId: 'python', keyPoints: ['Key concept topic 1', 'Key concept topic 2', 'Key concept topic 3'] }
}

const LEARNING_STEPS = ['Introduction & Overview', 'Core Concepts', 'Examples & Code', 'Common Pitfalls', 'Mini Check-In']

const INITIAL_ANALYTICS = {
  meaningfulResponses: 0,
  followUpQuestions: 0,
  explainAgainCount: 0,
  hintCount: 0,
  shortcutAttempts: 0,
  userMessages: 0,
  aiMessages: 1,
  probePromptsSeen: 0,
  probeResponses: 0,
}

function s1Key(id: string, userId: string) { return `cp_s1_${userId}_${id}` }

function buildProbePrompt(step: number, title: string, keyPoints: string[]) {
  const kp = keyPoints
  switch (step) {
    case 0:
      return `In your own words, what job does **${title}** do in a program?`
    case 1:
      return `Pick one key idea -- **${kp[0] || title}** or **${kp[1] || title}** -- and explain it like you're helping a classmate who is also new.`
    case 2:
      return `Give me one small example of **${title}** you could use in a real program.`
    case 3:
      return `Tell me one beginner mistake someone could make with **${title}** and how you would fix it.`
    case 4:
      return `Before Stage 2, summarize **${title}** in 2-3 simple sentences and mention one situation where you would use it.`
    default:
      return `Explain the most important idea behind **${title}** in your own words.`
  }
}

function buildStepTeachingRequest(step: number, title: string, keyPoints: string[], language: string) {
  const kp = keyPoints

  switch (step) {
    case 0:
      return `Teach a complete beginner the first part of ${title} in ${language}. Start with the basic meaning, what job it does in a program, and why it matters. Focus especially on "${kp[0] || title}" and keep the explanation very simple, friendly, and beginner-safe. If a tiny example helps, include one. Do not quiz the student yet.`
    case 1:
      return `Teach a complete beginner the core ideas of ${title} in ${language}. Focus on "${kp[0] || title}" and "${kp[1] || title}". Break the ideas into small, clear parts and connect them to what a student would notice in code. Do not quiz the student yet.`
    case 2:
      return `Teach a complete beginner how ${title} appears in real code in ${language}. Focus on "${kp[2] || kp[0] || title}" and "${kp[3] || kp[1] || title}". Use one tiny beginner-friendly example and explain each line in plain English if needed. Do not quiz the student yet.`
    case 3:
      return `Teach a complete beginner the common mistakes in ${title} in ${language}. Focus on the most common slip-ups, especially "${kp[kp.length - 1] || title}", and show how to avoid them in a calm, practical way. Do not quiz the student yet.`
    case 4:
      return `Give a warm final recap of ${title} for a complete beginner in ${language}. Summarize the definition, the main idea, one useful example, and one mistake to avoid. Keep it clear and confidence-building. Do not quiz the student yet.`
    default:
      return `Teach ${title} to a complete beginner in ${language}. Keep it simple, practical, and easy to follow. Do not quiz the student yet.`
  }
}

function buildStepCheckInMessage(step: number, title: string, keyPoints: string[]) {
  const label = step === LEARNING_STEPS.length - 1 ? 'Final check' : 'Tiny check-in'
  return `${label}: Take your time. One or two clear lines is enough.\n\n**${buildProbePrompt(step, title, keyPoints)}**`
}

function loadS1(conceptId: string, userId: string, greeting: ChatMessage) {
  if (typeof window === 'undefined') {
    return {
      messages: [greeting],
      currentStep: 0,
      stepsCompleted: [],
      stepResponses: [],
      analytics: INITIAL_ANALYTICS,
    }
  }
  try {
    const raw = localStorage.getItem(s1Key(conceptId, userId))
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved.messages) || saved.messages.length === 0) return null
    return {
      messages: saved.messages.map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) })),
      currentStep: saved.currentStep ?? 0,
      stepsCompleted: saved.stepsCompleted ?? [],
      stepResponses: saved.stepResponses ?? [],
      analytics: {
        meaningfulResponses: saved.analytics?.meaningfulResponses ?? INITIAL_ANALYTICS.meaningfulResponses,
        followUpQuestions: saved.analytics?.followUpQuestions ?? INITIAL_ANALYTICS.followUpQuestions,
        explainAgainCount: saved.analytics?.explainAgainCount ?? INITIAL_ANALYTICS.explainAgainCount,
        hintCount: saved.analytics?.hintCount ?? INITIAL_ANALYTICS.hintCount,
        shortcutAttempts: saved.analytics?.shortcutAttempts ?? INITIAL_ANALYTICS.shortcutAttempts,
        userMessages: saved.analytics?.userMessages ?? INITIAL_ANALYTICS.userMessages,
        aiMessages: saved.analytics?.aiMessages ?? saved.messages.filter((m: ChatMessage) => m.role === 'ai').length,
        probePromptsSeen: saved.analytics?.probePromptsSeen ?? INITIAL_ANALYTICS.probePromptsSeen,
        probeResponses: saved.analytics?.probeResponses ?? INITIAL_ANALYTICS.probeResponses,
      },
    }
  } catch { return null }
}

export default function Stage1PageClient({ params }: { params: { conceptId: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const concept = getConceptData(params.conceptId)
  const { warning, guardProps } = useStrictClipboardGuard('AI learning mode')

  const greeting: ChatMessage = {
    id: '1',
    role: 'ai',
    content: `Hi! Hi! I'm your learning guide for **${concept.title}**.\n\nWe'll learn this in 5 short parts so it feels clear, simple, and beginner-friendly. I'll first explain each part in easy language, and only after that I'll give you one tiny check-in so it never feels like a sudden test.\n\nHere's the roadmap for today:\n${concept.keyPoints.map((p, i) => `${i + 1}. **${p}**`).join('\n')}\n\nLet's start with the basic meaning and purpose of **${concept.title}**.`,
    timestamp: new Date(),
    type: 'greeting',
  }

  const [messages, setMessages] = useState<ChatMessage[]>([greeting])
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepsCompleted, setStepsCompleted] = useState<number[]>([])
  const [stepResponses, setStepResponses] = useState<number[]>([])
  const [analytics, setAnalytics] = useState(INITIAL_ANALYTICS)
  // Refs always hold the latest values so callbacks read current state without stale closures
  const analyticsRef = useRef(analytics)
  useEffect(() => { analyticsRef.current = analytics }, [analytics])
  const stepsCompletedRef = useRef(stepsCompleted)
  useEffect(() => { stepsCompletedRef.current = stepsCompleted }, [stepsCompleted])
  const stepResponsesRef = useRef(stepResponses)
  useEffect(() => { stepResponsesRef.current = stepResponses }, [stepResponses])
  const [isCompleting, setIsCompleting] = useState(false)
  const [isStageComplete, setIsStageComplete] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const [shouldBootstrapIntro, setShouldBootstrapIntro] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setHasRestoredState(true)
      return
    }

    const saved = loadS1(params.conceptId, user.uid, greeting)

    const shouldResetLegacyGreeting =
      saved &&
      saved.messages.length === 1 &&
      saved.messages[0].type === 'greeting' &&
      saved.messages[0].content.includes('**Quick check:**') &&
      (saved.stepResponses?.length ?? 0) === 0 &&
      (saved.stepsCompleted?.length ?? 0) === 0

    if (saved && !shouldResetLegacyGreeting) {
      setMessages(saved.messages)
      setCurrentStep(saved.currentStep)
      setStepsCompleted(saved.stepsCompleted)
      setStepResponses(saved.stepResponses)
      setAnalytics(saved.analytics)
      setShouldBootstrapIntro(false)
    } else {
      setMessages([greeting])
      setCurrentStep(0)
      setStepsCompleted([])
      setStepResponses([])
      setAnalytics(INITIAL_ANALYTICS)
      setShouldBootstrapIntro(true)
    }

    setHasRestoredState(true)
  }, [concept.keyPoints, concept.title, loading, params.conceptId, user?.uid])

  // Persist chat history on every change
  useEffect(() => {
    if (!hasRestoredState || !user) return
    try {
      localStorage.setItem(s1Key(params.conceptId, user.uid), JSON.stringify({
        messages,
        currentStep,
        stepsCompleted,
        stepResponses,
        analytics,
      }))
    } catch { /* storage quota */ }
  }, [analytics, currentStep, hasRestoredState, messages, params.conceptId, stepResponses, stepsCompleted, user])

  const addMessage = useCallback((content: string, role: 'ai' | 'user', type?: ChatMessage['type']) => {
    const msg: ChatMessage = { id: Date.now().toString(), role, content, timestamp: new Date(), type }
    setMessages((prev) => [...prev, msg])
  }, [])

  // Streams Ollama tokens directly into a chat bubble -- first word appears in ~1s
  const streamAIResponse = useCallback(async (payload: Record<string, unknown>) => {
    setIsTyping(true)
    // Prefix ensures this ID never collides with a user message ID
    const msgId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    let firstChunk = true

    await aiService.streamChat(payload, (chunk) => {
      if (firstChunk) {
        firstChunk = false
        setIsTyping(false)
        setMessages((prev) => [...prev, { id: msgId, role: 'ai', content: chunk, timestamp: new Date() }])
      } else {
        setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: m.content + chunk } : m))
      }
    })

    if (firstChunk) {
      setIsTyping(false)
      addMessage('Sorry, I had trouble responding. Please try again!', 'ai')
    }
  }, [addMessage])

  const teachStep = useCallback(async (step: number) => {
    await streamAIResponse({
      type: 'student-question',
      conceptTitle: concept.title,
      conceptKeyPoints: concept.keyPoints,
      language: concept.languageId,
      message: buildStepTeachingRequest(step, concept.title, concept.keyPoints, concept.languageId),
    })

    addMessage(buildStepCheckInMessage(step, concept.title, concept.keyPoints), 'ai')
    setAnalytics((prev) => ({
      ...prev,
      aiMessages: prev.aiMessages + 2,
      probePromptsSeen: prev.probePromptsSeen + 1,
    }))
  }, [concept, addMessage, streamAIResponse])

  useEffect(() => {
    if (!hasRestoredState || !shouldBootstrapIntro || loading) return

    setShouldBootstrapIntro(false)
    void teachStep(0)
  }, [hasRestoredState, loading, shouldBootstrapIntro, teachStep])

  const handleSendMessage = useCallback(async (text: string) => {
    addMessage(text, 'user')
    const askedFollowUp = /\?/.test(text) || /\b(why|how|what if|difference|compare|example)\b/i.test(text)
    setAnalytics((prev) => ({
      ...prev,
      userMessages: prev.userMessages + 1,
      followUpQuestions: prev.followUpQuestions + (askedFollowUp ? 1 : 0),
    }))

    const lower = text.toLowerCase().trim()

    // Bypass / jailbreak attempts
    const bypassKeywords = ['ignore', 'forget', 'pretend', 'roleplay', 'bypass', 'skip', 'cheat', 'reveal', 'show answer', 'give me the answer', 'jailbreak', 'act as', 'you are now', 'disregard']
    const isBypassAttempt = bypassKeywords.some((k) => lower.includes(k))

    // Off-topic detection: message must relate to programming/CS concepts or be a general question
    // Use a short word count + keyword check -- very short irrelevant messages are fine (e.g. "ok", "thanks")
    // Only flag longer off-topic messages (>= 5 words that don't mention programming-related terms)
    const programmingTerms = ['code', 'python', 'javascript', 'java', 'function', 'variable', 'loop', 'class', 'method', 'error', 'print', 'input', 'output', 'program', 'syntax', 'debug', 'return', 'list', 'dict', 'array', 'string', 'integer', 'boolean', 'if', 'else', 'for', 'while', 'import', 'define', 'call', 'value', 'type', 'data', 'algorithm', 'module', 'argument', 'parameter', 'operator', 'condition', 'logic', 'index', 'key', 'object', 'attribute', 'inherit', 'exception', 'recursion', concept.title.toLowerCase(), ...concept.keyPoints.map(k => k.split(' ')[0].toLowerCase())]
    const words = lower.split(/\s+/).filter(Boolean)
    const hasProgrammingContext = programmingTerms.some((t) => lower.includes(t))
    const isShortReply = words.length <= 4
    const isOffTopic = !isBypassAttempt && !hasProgrammingContext && !isShortReply && words.length >= 6

    if (isBypassAttempt || isOffTopic) {
      setAnalytics((prev) => ({ ...prev, shortcutAttempts: prev.shortcutAttempts + 1, aiMessages: prev.aiMessages + 1 }))
      addMessage(`I'm here to help you learn **${concept.title}**. Let's keep our chat focused on that -- once this topic is clear, you'll be ready for the assessment!`, 'ai')
      return
    }

    // Use refs for latest values -- avoids stale closure bugs in async callbacks
    const currentStepAnswered = stepResponsesRef.current.includes(currentStep)
    // Also treat step as answered if they already gave a meaningful reply this step
    // (meaningfulResponses > stepsCompleted means they replied for current step but haven't clicked "Got It" yet)
    const alreadyAnsweredThisStep = currentStepAnswered || analyticsRef.current.meaningfulResponses > stepsCompletedRef.current.length
    const meaningfulReply = isMeaningfulLearningMessage(text)

    if (!alreadyAnsweredThisStep) {
      if (!meaningfulReply) {
        setAnalytics((prev) => ({ ...prev, shortcutAttempts: prev.shortcutAttempts + 1, aiMessages: prev.aiMessages + 1 }))
        addMessage(`No pressure. Reply in your own words before we move ahead. Even one or two simple lines is enough.\n\n**Try this:** ${buildProbePrompt(currentStep, concept.title, concept.keyPoints)}`, 'ai')
        return
      }

      // Don't mark step done yet -- wait for student to explicitly click "Got It"
      // after seeing the AI's evaluation. This prevents wrong answers from auto-advancing.
      setAnalytics((prev) => ({
        ...prev,
        meaningfulResponses: prev.meaningfulResponses + 1,
        aiMessages: prev.aiMessages + 1,
      }))

      await streamAIResponse({
        type: 'probe-response',
        conceptTitle: concept.title,
        conceptKeyPoints: concept.keyPoints,
        language: concept.languageId,
        message: text,
        currentStepLabel: LEARNING_STEPS[currentStep],
        evaluateCorrectness: true,
      })

      // After AI responds, the "Next Step" button is now unlocked -- prompt student
      addMessage(`You can now click **"Next Step"** above to continue, or ask another question if you want clarification first.`, 'ai')
      return
    }

    setAnalytics((prev) => ({
      ...prev,
      meaningfulResponses: prev.meaningfulResponses + (meaningfulReply ? 1 : 0),
      aiMessages: prev.aiMessages + 1,
    }))

    await streamAIResponse({
      type: 'student-question',
      conceptTitle: concept.title,
      conceptKeyPoints: concept.keyPoints,
      language: concept.languageId,
      message: text,
    })
  }, [concept, currentStep, addMessage, streamAIResponse])

  const handleExplainAgain = useCallback(async () => {
    addMessage('Please explain that again in simpler terms', 'user')
    const lastAI = [...messages].reverse().find((m) => m.role === 'ai')
    setAnalytics((prev) => ({
      ...prev,
      userMessages: prev.userMessages + 1,
      explainAgainCount: prev.explainAgainCount + 1,
      aiMessages: prev.aiMessages + 1,
    }))
    await streamAIResponse({
      type: 'explain-again',
      conceptTitle: concept.title,
      conceptKeyPoints: concept.keyPoints,
      language: concept.languageId,
      previousExplanation: (lastAI?.content || '').slice(0, 400),
    })
  }, [concept, messages, addMessage, streamAIResponse])

  const handleGiveHint = useCallback(async () => {
    addMessage('Give me a hint', 'user')
    setAnalytics((prev) => ({
      ...prev,
      userMessages: prev.userMessages + 1,
      hintCount: prev.hintCount + 1,
      aiMessages: prev.aiMessages + 1,
    }))
    await streamAIResponse({
      type: 'hint',
      conceptTitle: concept.title,
      conceptKeyPoints: concept.keyPoints,
      language: concept.languageId,
    })
  }, [concept, addMessage, streamAIResponse])

  const handleGotIt = useCallback(async () => {
    // Read from refs to get the latest values -- avoids stale closure bugs
    const latestAnalytics = analyticsRef.current
    const latestStepsCompleted = stepsCompletedRef.current
    const latestStepResponses = stepResponsesRef.current

    const currentStepAnswered = latestStepResponses.includes(currentStep)
    const hasMeaningfulAttempt = latestAnalytics.meaningfulResponses > latestStepsCompleted.length
    if (!currentStepAnswered && !hasMeaningfulAttempt) {
      setAnalytics((prev) => ({ ...prev, shortcutAttempts: prev.shortcutAttempts + 1, aiMessages: prev.aiMessages + 1 }))
      addMessage(`Before we move on, let's do the tiny check-in for this part.\n\n**${buildProbePrompt(currentStep, concept.title, concept.keyPoints)}**`, 'ai')
      return
    }
    // Mark step as answered now (student confirmed understanding via "Got It")
    if (!currentStepAnswered) {
      setStepResponses((prev) => prev.includes(currentStep) ? prev : [...prev, currentStep])
      setAnalytics((prev) => ({
        ...prev,
        probeResponses: prev.probeResponses + (prev.probeResponses < LEARNING_STEPS.length ? 1 : 0),
      }))
    }

    const nextStep = currentStep + 1
    if (!latestStepsCompleted.includes(currentStep)) {
      setStepsCompleted((prev) => [...prev, currentStep])
    }
    addMessage("I'm ready for the next part.", 'user')

    const kp = concept.keyPoints
    if (nextStep < LEARNING_STEPS.length) {
      setCurrentStep(nextStep)
      void teachStep(nextStep)
    } else {
      setAnalytics((prev) => ({ ...prev, aiMessages: prev.aiMessages + 1 }))
      addMessage(`Excellent work! You've completed all 5 learning steps for **${concept.title}**.\n\nHere's what you now understand:\n${kp.map(p => `- ${p}`).join('\n')}\n\n**You're ready for Stage 2.** Click "Mark Complete" when you're ready to move into the assessment.`, 'ai')
    }
  }, [concept.keyPoints, concept.title, currentStep, addMessage, teachStep])

  const handleCompleteStage = async () => {
    if (!user) return
    setIsCompleting(true)
    try {
      const learningAnalytics = {
        conceptId: params.conceptId,
        stepsCompleted: stepsCompleted.map((step) => step + 1),
        probePromptsSeen: analytics.probePromptsSeen,
        probeResponses: stepResponses.length,
        meaningfulResponses: analytics.meaningfulResponses,
        followUpQuestions: analytics.followUpQuestions,
        explainAgainCount: analytics.explainAgainCount,
        hintCount: analytics.hintCount,
        shortcutAttempts: analytics.shortcutAttempts,
        userMessages: analytics.userMessages,
        aiMessages: analytics.aiMessages,
        effectivenessScore: computeLearningEffectivenessScore({
          stepsCompleted: stepsCompleted.map((step) => step + 1),
          probePromptsSeen: analytics.probePromptsSeen,
          probeResponses: stepResponses.length,
          meaningfulResponses: analytics.meaningfulResponses,
          followUpQuestions: analytics.followUpQuestions,
          explainAgainCount: analytics.explainAgainCount,
          hintCount: analytics.hintCount,
          shortcutAttempts: analytics.shortcutAttempts,
          userMessages: analytics.userMessages,
        }),
        completedAt: new Date(),
      }

      await saveLearningAnalytics(user.uid, params.conceptId, learningAnalytics)
      await markStageComplete(user.uid, params.conceptId, 1, 50)
      setIsStageComplete(true)
      setTimeout(() => router.push(`/learn/${params.conceptId}/stage2`), 1500)
    } catch {
      setIsCompleting(false)
    }
  }

  const currentStepAnswered = stepResponses.includes(currentStep)
  // Allow advancing once student has sent a meaningful reply for this step
  // (whether or not AI confirmed correctness yet)
  const currentStepHasMeaningfulAttempt = analytics.meaningfulResponses > stepsCompleted.length
  const canAdvanceStep = currentStepAnswered || currentStepHasMeaningfulAttempt
  const canComplete = stepsCompleted.length === LEARNING_STEPS.length

  return (
    <ProctoringOverlay>
    <div className="h-full flex flex-col bg-white" {...guardProps}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/concept/${params.conceptId}`} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors group shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-xs font-medium hidden sm:inline">Back</span>
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-yellow-600">Stage 1 of 3 -- Interactive Learning</p>
            <h1 className="text-sm font-bold text-gray-900 truncate">{concept.title}</h1>
          </div>
        </div>
        <div className="shrink-0 hidden sm:block">
          <StageProgress currentStage={1} completedStages={[]} />
        </div>
        {canComplete && !isStageComplete && (
          <button
            type="button"
            onClick={handleCompleteStage}
            disabled={isCompleting}
            className="shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-full transition-all disabled:opacity-50"
          >
            {isCompleting ? 'Saving...' : 'Mark Complete'}
          </button>
        )}
        {isStageComplete && (
          <div className="shrink-0 px-4 py-2 bg-green-500 text-white font-bold text-xs rounded-full">
            + Redirecting...
          </div>
        )}
      </div>

      {warning && (
        <div className="px-4 sm:px-6 py-2 bg-red-50 border-b border-red-100 shrink-0">
          <p className="text-xs font-semibold text-red-600">{warning}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Key points panel */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col bg-white border-r border-gray-100 p-4 space-y-4 overflow-y-auto">
          {/* Learning steps */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Learning Steps</h3>
            <div className="space-y-2">
              {LEARNING_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs ${
                  stepsCompleted.includes(i) ? 'bg-green-50 text-green-700' :
                  i === currentStep ? 'bg-yellow-50 text-yellow-800 font-semibold' :
                  'text-gray-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    stepsCompleted.includes(i) ? 'bg-green-500 text-white' :
                    i === currentStep ? 'bg-yellow-500 text-black' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {stepsCompleted.includes(i) ? '+' : i + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key concepts */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Key Points to Learn</h3>
            <ul className="space-y-2">
              {concept.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                  <span className="text-yellow-500 shrink-0 font-bold mt-0.5">&gt;</span>
                  <span className="text-xs font-semibold text-gray-800 leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* XP indicator */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-xs text-yellow-700 font-semibold">Complete this stage</p>
            <p className="text-xl font-black text-yellow-600 mt-0.5">+50 XP</p>
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex-1 overflow-hidden">
          <AIChat
            messages={messages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            onExplainAgain={handleExplainAgain}
            onGiveHint={handleGiveHint}
            onGotIt={handleGotIt}
            canAdvance={canAdvanceStep}
            advanceHint={canAdvanceStep ? 'Move ahead whenever you are ready.' : 'Answer in your own words to unlock the next part.'}
            disabled={isTyping || isStageComplete}
            stage={1}
            suggestedQuestions={concept.keyPoints.slice(0, 4).map(kp => `Explain: ${kp}`)}
          />
        </div>
      </div>
    </div>
    </ProctoringOverlay>
  )
}
