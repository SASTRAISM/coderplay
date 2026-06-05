import type { Concept } from '@/types'

const makeStages = (locked2 = true, locked3 = true) => [
  { stage: 1 as const, description: 'Interactive learning with guided explanations and examples', unlocked: true },
  { stage: 2 as const, description: '15-question assessment to test your understanding', unlocked: !locked2 },
  { stage: 3 as const, description: 'Hands-on coding challenges to practice', unlocked: !locked3 },
]

export const CONCEPTS: Record<string, Concept[]> = {
  // --- PYTHON -- SASTRA Syllabus: Python Programming with Web Frameworks ---------
  python: [
    // UNIT I -- Introduction to Python, Functions & Modules
    {
      id: 'python_intro',
      languageId: 'python',
      title: 'Introduction to Python',
      description: 'Get started with Python -- installation, first program, identifiers, and basic I/O.',
      estimatedTime: 30,
      difficulty: 'Beginner',
      order: 1,
      stages: makeStages(),
      learningContent: `Python is a high-level, interpreted, general-purpose programming language known for its readability.

Your first Python program:
print("Hello, World!")

Input/Output:
name = input("Enter your name: ")
print(f"Hello, {name}!")

Identifiers (variable names):
- Must start with a letter or underscore
- Can contain letters, digits, underscores
- Case-sensitive (name != Name != NAME)
- Cannot use reserved keywords (if, for, while, etc.)

Comments:
# This is a single-line comment
"""
This is a multi-line comment (docstring)
"""

Python is interpreted -- no compilation needed!
Run with: python3 filename.py`,
      keyPoints: [
        'Python programs are run by an interpreter, not compiled',
        'print() outputs to screen; input() reads from keyboard',
        'Identifiers are case-sensitive and cannot be keywords',
        'Indentation (4 spaces) defines code blocks in Python',
        'Python is dynamically typed -- no need to declare variable types',
      ],
    },
    {
      id: 'variables',
      languageId: 'python',
      title: 'Variables & Data Types',
      description: 'Learn how Python stores data: int, float, str, bool, and type conversion.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 2,
      stages: makeStages(),
      learningContent: `# Variables -- containers for storing values
name = "Alice"       # str (text)
age = 20             # int (whole number)
gpa = 8.5            # float (decimal)
is_enrolled = True   # bool (True/False)

# Multiple assignment
x, y, z = 1, 2, 3
a = b = c = 0

# Type checking
print(type(name))    # <class 'str'>
print(type(age))     # <class 'int'>

# Type conversion (casting)
int("42")      # -> 42
float("3.14")  # -> 3.14
str(100)       # -> "100"
bool(0)        # -> False

# Python is dynamically typed -- type can change
x = 10
x = "hello"   # valid in Python!`,
      keyPoints: [
        'Variables are created when a value is assigned to them',
        'Python has 4 basic data types: int, float, str, bool',
        'Use type() to check the type of a variable',
        'Type conversion: int(), float(), str(), bool()',
        'Python is dynamically typed -- no declaration needed',
      ],
    },
    {
      id: 'operators',
      languageId: 'python',
      title: 'Operators',
      description: 'Master arithmetic, comparison, logical, and assignment operators in Python.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 3,
      stages: makeStages(),
      learningContent: `# Arithmetic operators
+  -  *  /       # basic math
//               # floor division (integer result)
%                # modulo (remainder)
**               # exponentiation (power)

# Examples
10 // 3   # -> 3      (not 3.33)
10 % 3    # -> 1      (remainder)
2 ** 8    # -> 256    (2 to the power 8)

# Comparison operators (return True/False)
==  !=  >  <  >=  <=

# Logical operators
and  or  not

# Assignment operators
=  +=  -=  *=  /=  //=  %=  **=
x += 5    # same as x = x + 5

# Membership & Identity
in     # check if value in sequence
not in
is     # check if same object
is not`,
      keyPoints: [
        '// is floor division -- always returns an integer result',
        '% gives the remainder (modulo operation)',
        '** is the power/exponentiation operator',
        'Comparison operators return True or False',
        'and/or/not are logical operators for combining conditions',
      ],
    },
    {
      id: 'control_flow',
      languageId: 'python',
      title: 'Decision Control Structures',
      description: 'Control program flow using if, elif, else, and the ternary operator.',
      estimatedTime: 40,
      difficulty: 'Beginner',
      order: 4,
      stages: makeStages(),
      learningContent: `# if-elif-else
marks = 85
if marks >= 90:
    print("Grade: A")
elif marks >= 75:
    print("Grade: B")
elif marks >= 60:
    print("Grade: C")
else:
    print("Grade: F")

# Indentation is MANDATORY (4 spaces)

# Nested if
if age >= 18:
    if has_id:
        print("Entry allowed")
    else:
        print("Need ID")

# Ternary (one-line) operator
result = "Pass" if marks >= 50 else "Fail"

# Truthy / Falsy values
# Falsy: 0, "", [], {}, None, False
# Truthy: everything else`,
      keyPoints: [
        'if checks a condition; elif handles extra conditions; else is the default',
        'Python uses indentation (4 spaces) to define code blocks',
        'Conditions evaluate to True or False',
        'Ternary: value = x if condition else y (single line)',
        '0, empty strings, empty lists are Falsy in Python',
      ],
    },
    {
      id: 'loops',
      languageId: 'python',
      title: 'Loops (for & while)',
      description: 'Repeat actions with for and while loops; control them with break and continue.',
      estimatedTime: 45,
      difficulty: 'Beginner',
      order: 5,
      stages: makeStages(),
      learningContent: `# for loop -- iterates over a sequence
for i in range(5):           # 0, 1, 2, 3, 4
    print(i)

for item in ["a", "b", "c"]:
    print(item)

for i in range(1, 10, 2):   # 1, 3, 5, 7, 9 (step=2)

# while loop -- runs while condition is True
count = 0
while count < 5:
    print(count)
    count += 1

# Loop control
break       # exit the loop immediately
continue    # skip current iteration, go to next
pass        # placeholder -- do nothing

# else clause -- runs when loop ends normally (no break)
for i in range(3):
    print(i)
else:
    print("Loop done!")`,
      keyPoints: [
        'for loops iterate over sequences (lists, range, strings)',
        'range(start, stop, step) generates a number sequence',
        'while loops run as long as the condition is True',
        'break exits the loop; continue skips to next iteration',
        'Loops can have an else clause that runs when not broken',
      ],
    },
    {
      id: 'functions',
      languageId: 'python',
      title: 'Functions',
      description: 'Write reusable blocks of code with def, parameters, return values, and lambda.',
      estimatedTime: 50,
      difficulty: 'Beginner',
      order: 6,
      stages: makeStages(),
      learningContent: `# Define a function
def greet(name, greeting="Hello"):
    """Docstring: describes the function"""
    return f"{greeting}, {name}!"

# Call it
print(greet("Alice"))          # Hello, Alice!
print(greet("Bob", "Hi"))      # Hi, Bob!

# *args -- variable positional arguments
def add_all(*nums):
    return sum(nums)

add_all(1, 2, 3, 4)  # 10

# **kwargs -- variable keyword arguments
def show_info(**details):
    for k, v in details.items():
        print(f"{k}: {v}")

show_info(name="Alice", age=20)

# Lambda -- small anonymous function
square = lambda x: x ** 2
print(square(5))  # 25

# Scope
x = 10               # global
def change():
    global x         # access global variable
    x = 20`,
      keyPoints: [
        'def keyword defines a function; return sends back a result',
        'Default parameter values make arguments optional',
        '*args collects extra positional arguments as a tuple',
        '**kwargs collects extra keyword arguments as a dict',
        'Lambda creates a one-line anonymous function',
      ],
    },
    {
      id: 'modules',
      languageId: 'python',
      title: 'Modules & Packages',
      description: 'Organize and reuse code with Python modules, packages, and the standard library.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 7,
      stages: makeStages(),
      learningContent: `# Import a module
import math
print(math.sqrt(16))    # 4.0
print(math.pi)          # 3.14159...

# Import specific names
from math import sqrt, pi

# Alias
import numpy as np   # use np instead of numpy

# Your own module
# Save functions in mymodule.py
# import mymodule
# from mymodule import my_function

# Built-in standard library
import os        # OS operations (files, paths)
import sys       # System info, argv
import random    # Random numbers
import datetime  # Dates and times
import json      # JSON parsing
import re        # Regular expressions

# Install third-party packages
# pip install requests numpy pandas django

# Package = folder with __init__.py
# Module  = single .py file`,
      keyPoints: [
        'import loads a module into your program',
        'from module import name imports specific items',
        'Use aliases (import numpy as np) for shorter names',
        'The Python standard library has modules for almost everything',
        'pip installs third-party packages from PyPI',
      ],
    },
    // UNIT II -- File I/O, Exceptions, Dictionaries
    {
      id: 'file_handling',
      languageId: 'python',
      title: 'File Input/Output',
      description: 'Read from and write to files using Python\'s open() and the with statement.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 8,
      stages: makeStages(),
      learningContent: `# Reading a file
with open("data.txt", "r") as f:
    content = f.read()          # entire file as string
    lines = f.readlines()       # list of lines

# Writing a file (overwrites existing)
with open("output.txt", "w") as f:
    f.write("Hello, World!\\n")
    f.writelines(["line1\\n", "line2\\n"])

# Appending to a file
with open("log.txt", "a") as f:
    f.write("New entry\\n")

# File modes:
# "r"  -- read (default)
# "w"  -- write (overwrites)
# "a"  -- append
# "rb" -- read binary
# "wb" -- write binary

# Check if file exists
import os
if os.path.exists("file.txt"):
    print("File found!")

# Reading line by line (memory efficient)
with open("big.txt", "r") as f:
    for line in f:
        print(line.strip())`,
      keyPoints: [
        'Always use with open() -- it auto-closes the file on exit',
        'read() reads the whole file; readlines() gives a list of lines',
        'Mode "w" overwrites; mode "a" appends to existing content',
        'Binary mode (rb/wb) is used for non-text files like images',
        'os.path.exists() checks if a file or folder exists',
      ],
    },
    {
      id: 'exception_handling',
      languageId: 'python',
      title: 'Exception Handling',
      description: 'Handle runtime errors gracefully with try, except, else, and finally.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 9,
      stages: makeStages(),
      learningContent: `# Basic try-except
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero!")

# Multiple exceptions
try:
    x = int(input("Enter number: "))
    result = 100 / x
except ValueError:
    print("Not a valid number!")
except ZeroDivisionError:
    print("Cannot be zero!")
except Exception as e:        # catch-all
    print(f"Error: {e}")
else:
    print("Success:", result)  # runs if NO exception
finally:
    print("This always runs")  # cleanup code

# Raise your own exception
def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("Insufficient funds!")
    return balance - amount

# Custom exceptions
class InsufficientFundsError(Exception):
    pass`,
      keyPoints: [
        'try contains risky code; except handles the error',
        'except ExceptionType catches specific error types',
        'else runs only if no exception was raised',
        'finally always runs -- use it for cleanup (close files, etc.)',
        'raise throws your own exceptions; custom exceptions extend Exception',
      ],
    },
    {
      id: 'dictionaries',
      languageId: 'python',
      title: 'Dictionaries',
      description: 'Store and retrieve data as key-value pairs using Python dictionaries.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 10,
      stages: makeStages(),
      learningContent: `# Create a dictionary
student = {"name": "Alice", "age": 20, "gpa": 8.5}

# Access values
student["name"]              # "Alice"
student.get("grade", "N/A") # safe access -- returns N/A if missing

# Add/Update
student["branch"] = "CSE"   # add new key
student["age"] = 21          # update existing key

# Delete
del student["gpa"]
student.pop("age")           # returns and removes

# Iterate
for key, value in student.items():
    print(f"{key}: {value}")

# Common methods
student.keys()     # all keys
student.values()   # all values
student.items()    # (key, value) pairs
student.update({"year": 2})

# Dict comprehension
squares = {x: x**2 for x in range(5)}
# {0:0, 1:1, 2:4, 3:9, 4:16}

# Nested dict
college = {
    "name": "SASTRA",
    "students": {"cs": 500, "mech": 300}
}`,
      keyPoints: [
        'Dictionaries store data as key: value pairs',
        'Keys must be unique and immutable (str, int, tuple)',
        'Use .get() to avoid KeyError when key might not exist',
        '.keys(), .values(), .items() iterate over the dictionary',
        'Dict comprehension creates a dict in one line',
      ],
    },
    // UNIT III -- OOP & Internet Client Programming
    {
      id: 'oop',
      languageId: 'python',
      title: 'Object-Oriented Programming',
      description: 'Design programs with classes, objects, inheritance, and encapsulation.',
      estimatedTime: 60,
      difficulty: 'Intermediate',
      order: 11,
      stages: makeStages(),
      learningContent: `# Define a class
class Student:
    college = "SASTRA"          # class attribute (shared)

    def __init__(self, name, age):
        self.name = name         # instance attribute (unique)
        self.age = age

    def greet(self):
        return f"Hi, I'm {self.name} from {self.college}"

    def __str__(self):
        return f"Student({self.name}, {self.age})"

# Create objects
s1 = Student("Alice", 20)
s2 = Student("Bob", 21)
print(s1.greet())

# Inheritance
class GradStudent(Student):
    def __init__(self, name, age, thesis):
        super().__init__(name, age)  # call parent __init__
        self.thesis = thesis

    def greet(self):               # override parent method
        return f"{super().greet()} -- researching {self.thesis}"

# 4 Pillars:
# Encapsulation  -- hide internal state
# Inheritance    -- reuse parent class
# Polymorphism   -- same method, different behavior
# Abstraction    -- hide complex implementation`,
      keyPoints: [
        '__init__ is the constructor -- called when creating an object',
        'self refers to the current instance of the class',
        'Class attributes are shared; instance attributes are unique per object',
        'Inheritance: child class inherits parent\'s attributes and methods',
        'super() calls the parent class method from within a child class',
      ],
    },
    {
      id: 'internet_client',
      languageId: 'python',
      title: 'Internet Client Programming',
      description: 'Fetch data from the web using urllib and requests; parse and work with JSON APIs.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 12,
      stages: makeStages(),
      learningContent: `# urllib -- built-in module for HTTP requests
import urllib.request
import json

url = "https://api.example.com/data"
with urllib.request.urlopen(url) as response:
    raw = response.read()
    data = json.loads(raw)

# requests -- popular third-party library
# pip install requests
import requests

# GET request -- retrieve data
response = requests.get("https://api.example.com/users")
print(response.status_code)    # 200 = OK
data = response.json()         # parse JSON response

# POST request -- send data
payload = {"name": "Alice", "age": 20}
r = requests.post("https://api.example.com/create", json=payload)

# Common HTTP status codes:
# 200 OK
# 201 Created
# 400 Bad Request
# 404 Not Found
# 500 Internal Server Error

# Working with JSON
import json
json_str = '{"name": "Alice", "age": 20}'
obj = json.loads(json_str)     # JSON string -> Python dict
back = json.dumps(obj)         # Python dict -> JSON string`,
      keyPoints: [
        'urllib.request is Python\'s built-in HTTP module (no install needed)',
        'requests library provides a simpler, more powerful HTTP API',
        'response.status_code: 200=OK, 404=Not Found, 500=Server Error',
        'response.json() parses JSON response body into a Python dict',
        'json.loads() converts JSON string to dict; json.dumps() converts dict to JSON string',
      ],
    },
    // UNIT IV -- Web Clients/Servers & Django
    {
      id: 'web_client',
      languageId: 'python',
      title: 'Web Clients & Servers',
      description: 'Understand HTTP fundamentals and build simple web servers with Python\'s built-in http module.',
      estimatedTime: 45,
      difficulty: 'Advanced',
      order: 13,
      stages: makeStages(),
      learningContent: `# Simple HTTP server using Python's built-in module
from http.server import HTTPServer, SimpleHTTPRequestHandler

server = HTTPServer(("localhost", 8000), SimpleHTTPRequestHandler)
print("Serving at http://localhost:8000")
server.serve_forever()

# HTTP concepts:
# Client --[Request]--> Server
# Server --[Response]--> Client

# HTTP Methods:
# GET    -- retrieve data (read)
# POST   -- send/create data (write)
# PUT    -- update/replace data
# DELETE -- delete data

# HTTP Request structure:
# Method + URL + Headers + Body

# HTTP Headers carry metadata:
import urllib.request
req = urllib.request.Request(
    "https://example.com",
    headers={"User-Agent": "MyApp/1.0", "Accept": "application/json"}
)

# URL structure:
# https://example.com:443/path?key=value#anchor
# protocol://host:port/path?querystring#fragment

# CGI -- Common Gateway Interface (older way)
# Flask/Django -- modern Python web frameworks`,
      keyPoints: [
        'HTTP is the protocol for web communication (request/response cycle)',
        'GET retrieves data; POST sends new data to the server',
        'Python\'s http.server module creates a simple web server for development',
        'Headers carry metadata: content type, authentication, user agent',
        'Modern Python web apps use frameworks like Flask or Django',
      ],
    },
    {
      id: 'django',
      languageId: 'python',
      title: 'Django Web Framework',
      description: 'Build full-stack web applications with Django -- models, views, templates, and URL routing.',
      estimatedTime: 60,
      difficulty: 'Advanced',
      order: 14,
      stages: makeStages(),
      learningContent: `# Install and setup
# pip install django
# django-admin startproject mysite
# cd mysite
# python manage.py startapp myapp

# Django MVT Architecture:
# Model    -> database structure  (models.py)
# View     -> business logic      (views.py)
# Template -> HTML presentation   (templates/)

# models.py -- define database tables
from django.db import models
class Student(models.Model):
    name = models.CharField(max_length=100)
    age  = models.IntegerField()
    gpa  = models.FloatField()
    def __str__(self):
        return self.name

# views.py -- handle requests
from django.shortcuts import render
from .models import Student
def student_list(request):
    students = Student.objects.all()
    return render(request, "students.html", {"students": students})

# urls.py -- map URLs to views
from django.urls import path
from . import views
urlpatterns = [
    path("students/", views.student_list, name="student-list"),
]

# templates/students.html
# {% for s in students %}
#   <p>{{ s.name }} -- {{ s.gpa }}</p>
# {% endfor %}

# Run the server:
# python manage.py makemigrations
# python manage.py migrate
# python manage.py runserver`,
      keyPoints: [
        'Django follows MVT: Model (database), View (logic), Template (HTML)',
        'Models define database tables using Python classes -- no SQL needed',
        'Views receive HTTP requests and return responses',
        'Templates are HTML files with Django template tags for dynamic content',
        'URL routing in urls.py maps URLs to the correct view function',
      ],
    },
  ],

  // --- JAVASCRIPT -- The Language of the Web ------------------------------------
  javascript: [
    {
      id: 'js_intro',
      languageId: 'javascript',
      title: 'Introduction to JavaScript',
      description: 'Understand what JavaScript is, where it runs, and write your first JS program.',
      estimatedTime: 25,
      difficulty: 'Beginner',
      order: 1,
      stages: makeStages(),
      learningContent: `// JavaScript runs in the browser AND on servers (Node.js)
// It is the only language natively understood by web browsers

// Your first JS program (browser console or Node.js)
console.log("Hello, World!");

// JavaScript can be added to HTML in three ways:
// 1. Inline (not recommended)
// <button onclick="alert('Hi!')">Click</button>

// 2. Internal script tag
// <script> console.log("Hello"); </script>

// 3. External file (BEST practice)
// <script src="app.js" defer></script>

// Single-line comment
/* Multi-line
   comment */

// JS is case-sensitive: name != Name != NAME
// Statements end with ; (optional but recommended)
// JS is interpreted at runtime -- no compilation step

// Checking JavaScript version and environment
console.log(typeof window !== 'undefined' ? 'Browser' : 'Node.js');`,
      keyPoints: [
        'JavaScript runs in browsers AND on servers via Node.js',
        'Link external JS with <script src="file.js" defer></script>',
        'console.log() prints output to the browser/Node console',
        'JS is case-sensitive and dynamically typed',
        'JS is interpreted -- no compile step; errors show at runtime',
      ],
    },
    {
      id: 'js_variables',
      languageId: 'javascript',
      title: 'Variables -- var, let & const',
      description: 'Master JavaScript variable declarations, scope, hoisting, and the difference between var, let, and const.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 2,
      stages: makeStages(),
      learningContent: `// THREE ways to declare variables in modern JS

// 1. const -- for values that NEVER change (preferred)
const PI = 3.14159;
const name = "Arjun";
// PI = 5;  <- ERROR! Cannot reassign const

// 2. let -- for values that change (use this by default)
let score = 0;
score = 100;        // OK
let age = 20;

// 3. var -- OLD way, avoid in modern JS (has bugs with scope)
var x = 10;

// SCOPE -- where can a variable be accessed?
// Block scope (let/const): only inside { }
if (true) {
  let blockVar = "only inside";
  const blockConst = "me too";
  console.log(blockVar);  // works
}
// console.log(blockVar);  // ERROR: not defined

// Function scope (var): accessible in the whole function
function example() {
  var funcVar = "anywhere in function";
  console.log(funcVar);
}

// HOISTING -- var declarations are moved to the top (confusing!)
console.log(y);   // undefined (not error) -- var is hoisted
var y = 5;
// console.log(z); // ReferenceError -- let is NOT hoisted

// NAMING RULES
// - Start with letter, $, or _
// - Use camelCase: myVariableName
// - Cannot use reserved words: if, for, class, return, etc.

let firstName = "Ravi";     // camelCase (standard)
const MAX_SIZE = 100;       // UPPER_SNAKE for constants
let _private = "hidden";    // _ prefix convention`,
      keyPoints: [
        'Use const by default; switch to let only when reassignment is needed',
        'let and const have block scope {}; var has function scope (avoid var)',
        'Hoisting: var declarations are moved to top (set to undefined); let/const are not',
        'camelCase for variables, UPPER_SNAKE_CASE for true constants',
        'const for objects/arrays still allows changing their contents',
      ],
    },
    {
      id: 'js_datatypes',
      languageId: 'javascript',
      title: 'Data Types & Type Coercion',
      description: 'Explore JavaScript\'s 7 primitive types, the typeof operator, and the quirks of automatic type conversion.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 3,
      stages: makeStages(),
      learningContent: `// JavaScript has 7 PRIMITIVE types + Objects

// 1. Number -- integers AND decimals (one type handles both)
let age = 20;
let gpa = 8.75;
let big = 1_000_000;     // underscores for readability
console.log(10 / 0);     // Infinity (not an error!)
console.log(0 / 0);      // NaN -- "Not a Number"

// 2. String -- text in single, double, or backtick quotes
let s1 = 'Hello';
let s2 = "World";
let s3 = \`Hello, \${name}!\`;  // Template literal (backtick)

// 3. Boolean -- true or false
let isLoggedIn = true;
let hasPassed = false;

// 4. undefined -- variable declared but not assigned
let x;
console.log(x);       // undefined

// 5. null -- intentional empty value
let user = null;

// 6. Symbol -- unique identifiers (advanced)
const id = Symbol("id");

// 7. BigInt -- for very large numbers
const huge = 9007199254740991n;

// typeof -- check a variable's type
console.log(typeof 42);          // "number"
console.log(typeof "hello");     // "string"
console.log(typeof true);        // "boolean"
console.log(typeof undefined);   // "undefined"
console.log(typeof null);        // "object" <- famous JS bug!
console.log(typeof {});          // "object"
console.log(typeof []);          // "object" (arrays are objects)

// TYPE COERCION -- JS automatically converts types (beware!)
console.log("5" + 2);     // "52" -- number becomes string!
console.log("5" - 2);     // 3   -- string becomes number
console.log("5" * "2");   // 10  -- both become numbers
console.log(true + 1);    // 2   -- true is 1

// EXPLICIT CONVERSION (always do this instead)
Number("42")        // 42
Number("hello")     // NaN
String(100)         // "100"
Boolean(0)          // false
Boolean("")         // false
Boolean(null)       // false
Boolean(undefined)  // false
Boolean(NaN)        // false
// Everything else is truthy

// === vs == (always use ===)
console.log(5 == "5");    // true (coerces types -- dangerous!)
console.log(5 === "5");   // false (strict: no coercion)`,
      keyPoints: [
        '7 primitives: Number, String, Boolean, undefined, null, Symbol, BigInt',
        'typeof null returns "object" -- a famous JS bug (null is NOT an object)',
        'Always use === not == to avoid unexpected type coercion',
        '"5" + 2 = "52" (string wins with +); "5" - 2 = 3 (math wins with -)',
        'Falsy values: 0, "", null, undefined, NaN, false -- everything else is truthy',
      ],
    },
    {
      id: 'js_operators',
      languageId: 'javascript',
      title: 'Operators & Expressions',
      description: 'Master arithmetic, comparison, logical, and modern JS operators like nullish coalescing and optional chaining.',
      estimatedTime: 30,
      difficulty: 'Beginner',
      order: 4,
      stages: makeStages(),
      learningContent: `// ARITHMETIC operators
let a = 10, b = 3;
console.log(a + b);    // 13
console.log(a - b);    // 7
console.log(a * b);    // 30
console.log(a / b);    // 3.333...  (JS always uses float division)
console.log(a % b);    // 1 (remainder)
console.log(a ** b);   // 1000 (10 to the power 3)

// INCREMENT / DECREMENT
let x = 5;
console.log(x++);  // 5 -- returns THEN increments
console.log(x);    // 6
console.log(++x);  // 7 -- increments THEN returns

// ASSIGNMENT operators
x += 10;   // x = x + 10
x -= 3;    // x = x - 3
x *= 2;    // x = x * 2
x /= 4;    // x = x / 4
x **= 2;   // x = x ** 2
x %= 7;    // x = x % 7

// COMPARISON (always return true/false)
console.log(5 === 5);    // true (strict equality -- use this)
console.log(5 !== "5");  // true (strict inequality)
console.log(5 > 3);      // true
console.log(5 >= 5);     // true
console.log(3 < 5);      // true

// LOGICAL operators
console.log(true && false);  // false (AND -- both must be true)
console.log(true || false);  // true  (OR  -- one must be true)
console.log(!true);          // false (NOT)

// SHORT-CIRCUIT evaluation
const user = null;
const name = user && user.name;    // null (stops at user)
const display = name || "Guest";   // "Guest" (name is falsy)

// NULLISH COALESCING (??) -- only null/undefined, not 0 or ""
const score = 0;
console.log(score || 100);   // 100 -- wrong! 0 is falsy
console.log(score ?? 100);   // 0   -- correct! 0 is not null/undefined

// OPTIONAL CHAINING (?.) -- safe property access
const person = { address: { city: "Chennai" } };
console.log(person?.address?.city);   // "Chennai"
console.log(person?.phone?.number);   // undefined (no error!)

// TERNARY operator -- one-line if/else
const age = 20;
const status = age >= 18 ? "Adult" : "Minor";
console.log(status);  // "Adult"

// SPREAD (...) -- expands arrays/objects
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];   // [1,2,3,4,5]`,
      keyPoints: [
        'JS division always returns float: 10/3 = 3.333 (unlike Python\'s //)',
        'Use === and !== always; avoid == and != (they coerce types)',
        '?? (nullish coalescing) only falls back for null/undefined, not 0 or ""',
        '?. (optional chaining) prevents errors when accessing nested properties',
        'Ternary: condition ? valueIfTrue : valueIfFalse',
      ],
    },
    {
      id: 'js_control_flow',
      languageId: 'javascript',
      title: 'Control Flow -- if, switch & Ternary',
      description: 'Control program execution with conditional statements, switch-case, and logical branching patterns.',
      estimatedTime: 30,
      difficulty: 'Beginner',
      order: 5,
      stages: makeStages(),
      learningContent: `// if / else if / else
const marks = 85;

if (marks >= 90) {
  console.log("Grade: O");
} else if (marks >= 75) {
  console.log("Grade: A");
} else if (marks >= 60) {
  console.log("Grade: B");
} else if (marks >= 50) {
  console.log("Grade: C");
} else {
  console.log("Grade: F");
}

// IMPORTANT: curly braces {} are optional for single-line if
// But ALWAYS use them to avoid bugs!

// TRUTHY and FALSY in conditions
// Falsy: false, 0, "", null, undefined, NaN
// Truthy: everything else (including "0", [], {})
const username = "";
if (!username) {
  console.log("Please enter a name");  // runs because "" is falsy
}

// switch-case -- great for discrete values
const day = "Monday";
switch (day) {
  case "Monday":
  case "Tuesday":
    console.log("Start of week");
    break;              // ALWAYS break or it falls through!
  case "Friday":
    console.log("Almost weekend!");
    break;
  default:
    console.log("Mid-week");
}

// Intentional fall-through example:
const num = 2;
switch (num) {
  case 1:
  case 2:
  case 3:
    console.log("1, 2, or 3");  // matches 1, 2, or 3
    break;
  default:
    console.log("Other");
}

// TERNARY for simple conditions
const isAdult = age >= 18 ? "Yes" : "No";

// Nested ternary (use sparingly -- hard to read)
const grade = marks >= 90 ? "O" : marks >= 75 ? "A" : "B";

// LOGICAL operators as conditionals
const user = null;
user && console.log(user.name);        // only runs if user is truthy
const display = user?.name ?? "Guest"; // safe with optional chaining`,
      keyPoints: [
        'Always use curly braces {} in if/else even for single statements',
        'switch needs break after each case or execution falls through to the next',
        'Falsy: false, 0, "", null, undefined, NaN -- everything else is truthy',
        'Ternary is for simple conditions only; nested ternaries hurt readability',
        'Use logical && as a guard: condition && doSomething()',
      ],
    },
    {
      id: 'js_loops',
      languageId: 'javascript',
      title: 'Loops -- for, while, for...of & for...in',
      description: 'Master all JavaScript loop types: classic for, while, do-while, and modern for...of and for...in.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 6,
      stages: makeStages(),
      learningContent: `// 1. for loop -- best when you know the count
for (let i = 0; i < 5; i++) {
  console.log(i);  // 0, 1, 2, 3, 4
}

// Reverse loop
for (let i = 10; i >= 1; i--) {
  console.log(i);
}

// 2. while loop -- runs while condition is true
let count = 0;
while (count < 5) {
  console.log(count);
  count++;
}
// If condition starts false, body never runs

// 3. do...while -- runs at least once (checks condition AFTER)
let num = 10;
do {
  console.log(num);  // prints 10, even though condition is false
  num++;
} while (num < 10);

// 4. for...of -- iterate over ARRAY VALUES (modern, clean)
const fruits = ["apple", "banana", "mango"];
for (const fruit of fruits) {
  console.log(fruit);  // apple, banana, mango
}

// Also works on strings
for (const char of "Hello") {
  console.log(char);  // H, e, l, l, o
}

// 5. for...in -- iterate over OBJECT KEYS
const student = { name: "Priya", age: 21, cgpa: 8.5 };
for (const key in student) {
  console.log(\`\${key}: \${student[key]}\`);
}
// name: Priya  |  age: 21  |  cgpa: 8.5

// break -- exit the loop immediately
for (let i = 0; i < 10; i++) {
  if (i === 5) break;
  console.log(i);  // 0, 1, 2, 3, 4
}

// continue -- skip this iteration, keep looping
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) continue;  // skip even numbers
  console.log(i);  // 1, 3, 5, 7, 9
}

// NESTED loops -- multiplication table
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    process.stdout.write(\`\${i * j}\t\`);
  }
  console.log();
}

// Array.forEach() -- a functional loop alternative
fruits.forEach((fruit, index) => {
  console.log(\`\${index}: \${fruit}\`);
});`,
      keyPoints: [
        'for: use when iteration count is known',
        'for...of: cleanest way to loop over array values (not index)',
        'for...in: loops over object KEYS (not values directly)',
        'do...while guarantees at least one execution before checking condition',
        'break exits the loop; continue skips to the next iteration',
      ],
    },
    {
      id: 'js_functions',
      languageId: 'javascript',
      title: 'Functions & Arrow Functions',
      description: 'Understand function declarations, expressions, arrow functions, default params, rest/spread, and closures.',
      estimatedTime: 45,
      difficulty: 'Beginner',
      order: 7,
      stages: makeStages(),
      learningContent: `// THREE ways to define functions in JavaScript

// 1. Function Declaration -- hoisted (can be called before definition)
function greet(name) {
  return "Hello, " + name + "!";
}
console.log(greet("Ravi"));  // Hello, Ravi!

// 2. Function Expression -- NOT hoisted
const add = function(a, b) {
  return a + b;
};
console.log(add(3, 4));  // 7

// 3. Arrow Function (ES6) -- shorter syntax, no own 'this'
const multiply = (a, b) => a * b;         // implicit return (one expression)
const square = n => n * n;                 // one param: no parentheses needed
const sayHi = () => console.log("Hi!");   // no params: () required

// Explicit return for multi-line arrow functions
const getInfo = (name, age) => {
  const message = \`\${name} is \${age} years old\`;
  return message;
};

// DEFAULT PARAMETERS
function power(base, exp = 2) {         // exp defaults to 2
  return base ** exp;
}
console.log(power(3));      // 9  (3^2)
console.log(power(2, 10)); // 1024

// REST PARAMETERS (...args) -- collect extra arguments into an array
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3, 4, 5));  // 15

// FIRST-CLASS functions -- functions are values in JS
function apply(fn, value) {
  return fn(value);
}
console.log(apply(square, 5));  // 25

// CALLBACK functions -- pass a function as argument
function doTwice(action) {
  action();
  action();
}
doTwice(() => console.log("SASTRA!"));  // prints twice

// CLOSURE -- inner function remembers outer function's variables
function counter() {
  let count = 0;          // private variable
  return function() {
    count++;
    return count;
  };
}
const inc = counter();
console.log(inc());  // 1
console.log(inc());  // 2
console.log(inc());  // 3 (count persists!)

// IIFE -- Immediately Invoked Function Expression
(function() {
  const secret = "hidden";
  console.log("Runs immediately!");
})();
// console.log(secret);  // ReferenceError -- secret is private`,
      keyPoints: [
        'Function declarations are hoisted; expressions and arrows are not',
        'Arrow functions have no own this -- use regular functions for methods',
        'Default params: function greet(name = "Student") {}',
        'Rest params (...args) collect multiple arguments into an array',
        'Closures let inner functions access outer variables even after the outer function returns',
      ],
    },
    {
      id: 'js_arrays',
      languageId: 'javascript',
      title: 'Arrays & Array Methods',
      description: 'Create and manipulate arrays using modern methods: map, filter, reduce, find, forEach, and more.',
      estimatedTime: 45,
      difficulty: 'Beginner',
      order: 8,
      stages: makeStages(),
      learningContent: `// Creating arrays
const nums = [1, 2, 3, 4, 5];
const mixed = [1, "hello", true, null];      // JS arrays can mix types
const matrix = [[1,2],[3,4],[5,6]];           // 2D array
const empty = new Array(5).fill(0);           // [0,0,0,0,0]

// ACCESSING elements (zero-indexed)
console.log(nums[0]);          // 1 (first)
console.log(nums[nums.length - 1]);  // 5 (last)
console.log(nums.at(-1));      // 5 (modern: negative index)

// MODIFYING arrays
nums.push(6);           // add to end -> [1,2,3,4,5,6]
nums.pop();             // remove from end -> [1,2,3,4,5]
nums.unshift(0);        // add to start -> [0,1,2,3,4,5]
nums.shift();           // remove from start -> [1,2,3,4,5]

// splice(start, deleteCount, ...items)
nums.splice(2, 1);      // remove 1 element at index 2
nums.splice(2, 0, 10);  // insert 10 at index 2

// slice(start, end) -- returns new array, does NOT modify original
const part = nums.slice(1, 4);  // elements from index 1 to 3

// SEARCHING
console.log(nums.indexOf(3));         // first index of 3, -1 if absent
console.log(nums.includes(3));        // true/false
console.log(nums.find(n => n > 3));   // first element matching condition
console.log(nums.findIndex(n => n > 3)); // index of first match

// TRANSFORMATION (returns a NEW array -- does not mutate)
const doubled = nums.map(n => n * 2);
const evens   = nums.filter(n => n % 2 === 0);
const total   = nums.reduce((acc, n) => acc + n, 0);  // sum
const flat    = [[1,2],[3,4]].flat();   // [1,2,3,4]
const sorted  = [...nums].sort((a, b) => a - b);  // ascending

// forEach -- like map but for side effects (no return value)
nums.forEach((n, i) => console.log(\`[\${i}] = \${n}\`));

// COMBINING arrays
const a = [1, 2], b = [3, 4];
const combined = [...a, ...b];        // spread: [1,2,3,4]
const joined   = a.concat(b);        // also [1,2,3,4]

// USEFUL utilities
console.log(Array.isArray(nums));    // true
console.log(nums.join(" - "));       // "1 - 2 - 3 - 4 - 5"
const [first, second, ...rest] = nums;  // destructuring`,
      keyPoints: [
        'map() transforms each element and returns a NEW array',
        'filter() keeps elements matching a condition and returns a NEW array',
        'reduce() accumulates all elements into a single value',
        'push/pop modify the END; unshift/shift modify the START',
        'splice() mutates the original; slice() returns a copy',
      ],
    },
    {
      id: 'js_objects',
      languageId: 'javascript',
      title: 'Objects, Methods & JSON',
      description: 'Work with JavaScript objects: creation, access, methods, destructuring, spread, and JSON serialization.',
      estimatedTime: 40,
      difficulty: 'Beginner',
      order: 9,
      stages: makeStages(),
      learningContent: `// Creating objects (key: value pairs)
const student = {
  name: "Kavya",
  age: 20,
  cgpa: 8.9,
  branch: "CSE",
  isEnrolled: true,
};

// ACCESSING properties
console.log(student.name);            // dot notation (preferred)
console.log(student["branch"]);       // bracket notation (for dynamic keys)

const key = "cgpa";
console.log(student[key]);            // 8.9 -- bracket is powerful!

// MODIFYING objects
student.year = 3;                     // add new property
student.cgpa = 9.1;                   // update existing
delete student.isEnrolled;            // remove property

// METHODS -- functions inside objects
const person = {
  name: "Arjun",
  greet() {                           // shorthand method syntax
    return \`Hi, I'm \${this.name}\`;   // 'this' = the object
  },
  greetArrow: () => {
    // Arrow functions have NO own 'this' -- avoid for methods!
    return "Arrow: this is window/undefined";
  },
};
console.log(person.greet());  // "Hi, I'm Arjun"

// OBJECT DESTRUCTURING -- extract properties cleanly
const { name, age, cgpa = 8.0 } = student;  // cgpa has default
console.log(name, age);   // Kavya 20

// Rename while destructuring
const { name: studentName, branch: dept } = student;
console.log(studentName, dept);  // Kavya CSE

// SPREAD operator with objects
const base = { x: 1, y: 2 };
const extended = { ...base, z: 3, x: 99 };   // { x:99, y:2, z:3 }

// Merging objects
const merged = { ...obj1, ...obj2 };   // obj2 keys overwrite obj1

// COMPUTED property names
const field = "score";
const record = { [field]: 95 };   // { score: 95 }

// Object utility methods
Object.keys(student);    // ["name", "age", "cgpa", "branch"]
Object.values(student);  // ["Kavya", 20, 8.9, "CSE"]
Object.entries(student); // [["name","Kavya"], ["age",20], ...]

// JSON -- JavaScript Object Notation (for APIs and storage)
const json = JSON.stringify(student);  // object -> string
console.log(json);  // '{"name":"Kavya","age":20,...}'

const parsed = JSON.parse(json);       // string -> object
console.log(parsed.name);  // "Kavya"

// Pretty print JSON
console.log(JSON.stringify(student, null, 2));

// 'in' operator -- check if property exists
console.log("name" in student);  // true
console.log("phone" in student); // false`,
      keyPoints: [
        'Use dot notation (obj.key) for known keys; bracket notation (obj["key"]) for dynamic keys',
        'Methods use this to refer to the object -- arrow functions lack own this',
        'Destructuring: const { name, age } = person -- clean property extraction',
        'Spread copies object properties: const copy = { ...original, newKey: val }',
        'JSON.stringify() converts object->string; JSON.parse() converts string->object',
      ],
    },
    {
      id: 'js_strings',
      languageId: 'javascript',
      title: 'Strings & Template Literals',
      description: 'Master JavaScript string creation, template literals, all key string methods, and regex basics.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 10,
      stages: makeStages(),
      learningContent: `// STRING creation
const s1 = 'single quotes';
const s2 = "double quotes";
const s3 = \`backtick template literal\`;

// TEMPLATE LITERALS (backticks) -- embed expressions
const name = "Priya";
const cgpa = 9.1;
console.log(\`Hello, \${name}! Your CGPA is \${cgpa}\`);
console.log(\`2 + 2 = \${2 + 2}\`);          // expressions work
console.log(\`\${cgpa >= 9 ? "O Grade" : "A Grade"}\`);  // ternary inside

// Multi-line strings with backticks
const message = \`Dear \${name},
Welcome to CoderPlay!
Your CGPA: \${cgpa}\`;
console.log(message);

// STRING PROPERTIES
console.log(name.length);   // 5

// CASE methods
"hello".toUpperCase();  // "HELLO"
"WORLD".toLowerCase();  // "world"

// SEARCH methods
const str = "JavaScript is amazing!";
str.includes("amazing");          // true
str.startsWith("Java");           // true
str.endsWith("!");                // true
str.indexOf("is");                // 11 (first occurrence, -1 if absent)
str.lastIndexOf("a");             // index of last 'a'

// EXTRACTION
str.slice(0, 10);     // "JavaScript"
str.slice(-8);        // "amazing!" (negative: from end)
str.substring(0, 10); // "JavaScript" (no negative support)

// SPLITTING and JOINING
"one,two,three".split(",");    // ["one","two","three"]
["a","b","c"].join("-");        // "a-b-c"

// REPLACING
str.replace("amazing", "awesome");       // replaces first match
str.replaceAll("a", "@");                // replaces ALL 'a'
str.replace(/is/g, "IS");               // regex: replace all 'is'

// TRIMMING whitespace
"  hello  ".trim();          // "hello"
"  hello  ".trimStart();     // "hello  "
"  hello  ".trimEnd();       // "  hello"

// PADDING
"5".padStart(3, "0");  // "005"  (useful for IDs)
"hi".padEnd(5, "!");   // "hi!!!"

// REPEAT and AT
"ha".repeat(3);        // "hahaha"
str.at(0);             // "J" (first char)
str.at(-1);            // "!" (last char)

// CHARCODE
"A".charCodeAt(0);     // 65
String.fromCharCode(65); // "A"

// Strings are IMMUTABLE -- methods return new strings
const original = "Hello";
const upper = original.toUpperCase();
console.log(original);  // "Hello" -- unchanged`,
      keyPoints: [
        'Template literals (backticks) allow embedded expressions: `Hello ${name}`',
        'Strings are immutable -- methods return new strings, never modify the original',
        'slice(start, end): supports negative indices; substring() does not',
        'split() converts string->array; join() converts array->string',
        'trim() removes whitespace; includes() checks for substrings',
      ],
    },
    {
      id: 'js_dom',
      languageId: 'javascript',
      title: 'DOM Manipulation',
      description: 'Manipulate web pages with the Document Object Model -- select, create, modify, and remove HTML elements.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 11,
      stages: makeStages(),
      learningContent: `// DOM = Document Object Model
// The browser builds a tree from your HTML that JS can read & modify

// -- SELECTING elements ----------------------------------------
const btn = document.getElementById("myBtn");           // by ID
const title = document.querySelector(".title");          // first match (CSS selector)
const items = document.querySelectorAll("li");           // all matches -> NodeList
const divs = document.getElementsByTagName("div");       // by tag (live HTMLCollection)
const btns = document.getElementsByClassName("btn");     // by class

// Iterating NodeList
items.forEach(item => console.log(item.textContent));
// OR: for...of
for (const item of items) { }

// -- READING and MODIFYING content -----------------------------
title.textContent = "New Title";          // plain text (safe)
title.innerHTML   = "<strong>Bold!</strong>"; // HTML (careful with user input!)

// Reading value from input
const input = document.querySelector("#nameInput");
console.log(input.value);                 // user's typed text

// -- STYLING elements ------------------------------------------
title.style.color     = "blue";
title.style.fontSize  = "24px";
title.style.display   = "none";     // hide element

// CSS Classes (better than inline styles)
title.classList.add("highlight");
title.classList.remove("hidden");
title.classList.toggle("active");        // add if absent, remove if present
title.classList.contains("highlight");   // true/false

// -- ATTRIBUTES ------------------------------------------------
const img = document.querySelector("img");
img.getAttribute("src");               // get attribute value
img.setAttribute("src", "new.jpg");    // set attribute
img.removeAttribute("disabled");       // remove attribute
img.hasAttribute("disabled");          // check if exists

// Data attributes
// <div data-user-id="42" data-role="admin">
const div = document.querySelector("div");
div.dataset.userId;    // "42"
div.dataset.role;      // "admin"

// -- CREATING and INSERTING elements ---------------------------
const newLi = document.createElement("li");
newLi.textContent = "New Item";
newLi.classList.add("list-item");

const ul = document.querySelector("ul");
ul.appendChild(newLi);          // add at end
ul.prepend(newLi);              // add at start
ul.insertBefore(newLi, ul.children[2]); // insert before 3rd item
ul.replaceChild(newLi, ul.children[0]); // replace first item

// Modern insertion methods
ul.insertAdjacentHTML("beforeend", "<li>Fast way</li>");

// -- REMOVING elements -----------------------------------------
const toRemove = document.querySelector(".remove-me");
toRemove.remove();    // modern: self-remove
// Old way: parent.removeChild(child)

// -- TRAVERSING the DOM ----------------------------------------
const el = document.querySelector(".item");
el.parentElement;         // parent node
el.children;              // HTMLCollection of children
el.firstElementChild;     // first child element
el.lastElementChild;      // last child element
el.nextElementSibling;    // next sibling
el.previousElementSibling; // previous sibling`,
      keyPoints: [
        'querySelector() returns first match; querySelectorAll() returns all as NodeList',
        'textContent sets plain text (safe); innerHTML sets HTML (risky with user input)',
        'classList.add/remove/toggle manages CSS classes cleanly',
        'createElement() + appendChild() is the safe way to add dynamic content',
        'dataset gives access to data-* attributes: element.dataset.userId',
      ],
    },
    {
      id: 'js_events',
      languageId: 'javascript',
      title: 'Events & Event Listeners',
      description: 'Handle user interactions with event listeners, event propagation, delegation, and common browser events.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 12,
      stages: makeStages(),
      learningContent: `// Events let JS respond to user actions and browser changes

// -- ADDING event listeners ------------------------------------
const btn = document.querySelector("#myBtn");

// Best practice: addEventListener (can add multiple, can remove)
btn.addEventListener("click", function(event) {
  console.log("Button clicked!", event);
});

// Arrow function version
btn.addEventListener("click", (e) => {
  console.log("Target:", e.target);         // element that was clicked
  console.log("Type:", e.type);             // "click"
  console.log("X position:", e.clientX);    // cursor X coordinate
});

// REMOVING event listeners (must use named function)
function handleClick(e) { console.log("clicked"); }
btn.addEventListener("click", handleClick);
btn.removeEventListener("click", handleClick);

// -- COMMON EVENT TYPES ----------------------------------------
// Mouse: click, dblclick, mouseenter, mouseleave, mousemove
// Keyboard: keydown, keyup, keypress (deprecated)
// Form: submit, change, input, focus, blur
// Window: load, resize, scroll
// Touch: touchstart, touchend, touchmove

// KEYBOARD events
document.addEventListener("keydown", (e) => {
  console.log(e.key);          // "Enter", "ArrowUp", "a", etc.
  console.log(e.code);         // "KeyA", "Space", "Enter"
  console.log(e.ctrlKey);      // true if Ctrl is held
  if (e.key === "Enter") { /* submit */ }
});

// FORM events
const form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();    // STOP the default browser form submission
  const data = new FormData(form);
  console.log(data.get("username"));
});

const input = document.querySelector("input");
input.addEventListener("input", (e) => {
  console.log("Live:", e.target.value);   // fires on every keystroke
});
input.addEventListener("change", (e) => {
  console.log("Changed:", e.target.value); // fires when focus leaves
});

// -- EVENT PROPAGATION -----------------------------------------
// Events BUBBLE UP: child -> parent -> document (default)
// e.stopPropagation() stops bubbling

document.querySelector(".child").addEventListener("click", (e) => {
  e.stopPropagation();  // don't trigger parent's click
});

// -- EVENT DELEGATION -- attach ONE listener to parent ----------
// Efficient: works for dynamically added elements too
document.querySelector("ul").addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    console.log("Clicked item:", e.target.textContent);
  }
});

// -- once option -- fire only one time -------------------------
btn.addEventListener("click", handler, { once: true });

// -- DOMContentLoaded -- run after HTML is parsed ---------------
document.addEventListener("DOMContentLoaded", () => {
  // Safe to manipulate DOM here
});

// -- Window events ---------------------------------------------
window.addEventListener("resize", () => {
  console.log(window.innerWidth, window.innerHeight);
});
window.addEventListener("scroll", () => {
  console.log(window.scrollY);  // pixels scrolled from top
});`,
      keyPoints: [
        'addEventListener(type, handler) is always preferred over onclick= attributes',
        'e.preventDefault() stops the default browser action (form submit, link follow)',
        'Events bubble UP from child to parent -- use e.stopPropagation() to stop',
        'Event delegation: listen on a parent to handle all child events efficiently',
        'DOMContentLoaded fires when HTML is parsed; load fires after all resources load',
      ],
    },
    {
      id: 'js_es6',
      languageId: 'javascript',
      title: 'ES6+ Modern Features',
      description: 'Learn modern JavaScript features: destructuring, spread/rest, template literals, modules, classes, and more.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 13,
      stages: makeStages(),
      learningContent: `// ES6 (2015) and beyond gave JS a massive upgrade

// -- DESTRUCTURING ---------------------------------------------
// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first=1, second=2, rest=[3,4,5]

// Swap variables elegantly
let a = 1, b = 2;
[a, b] = [b, a];  // a=2, b=1

// Object destructuring with defaults and renaming
const { name = "Guest", age: userAge = 18 } = person;

// Nested destructuring
const { address: { city, pin } } = { address: { city: "Chennai", pin: "600001" } };

// Function parameter destructuring
function greet({ name, age = 18 }) {
  return \`Hi \${name}, age \${age}\`;
}
greet({ name: "Priya", age: 21 });

// -- SPREAD & REST ---------------------------------------------
// Spread (...): EXPAND array/object
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];         // [1,2,3,4,5]
const copy = [...arr1];               // shallow copy
const obj2 = { ...obj1, key: "val" }; // object spread

// Rest (...): COLLECT remaining args
function sum(first, ...others) {
  return first + others.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4);  // 10

// -- CLASSES -- syntactic sugar over prototypes -----------------
class Animal {
  #name;  // private field (ES2022)

  constructor(name, sound) {
    this.#name = name;
    this.sound = sound;
  }

  speak() {
    return \`\${this.#name} says \${this.sound}\`;
  }

  get name() { return this.#name; }  // getter

  static create(name, sound) {       // static method
    return new Animal(name, sound);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name, "Woof");             // call parent constructor
    this.tricks = [];
  }

  learn(trick) {
    this.tricks.push(trick);
    return this;                     // method chaining
  }
}

const dog = new Dog("Buddy");
dog.learn("sit").learn("fetch");
console.log(dog.speak());  // "Buddy says Woof"

// -- MODULES (import / export) ---------------------------------
// math.js
export const PI = 3.14159;
export function add(a, b) { return a + b; }
export default function multiply(a, b) { return a * b; }

// main.js
import multiply, { PI, add } from "./math.js";
import * as Math from "./math.js";  // import everything

// -- SHORT-CIRCUIT & OPTIONAL CHAINING ------------------------
const user = null;
const city = user?.address?.city ?? "Unknown";  // "Unknown"

// -- LOGICAL ASSIGNMENT ----------------------------------------
let name2 = null;
name2 ??= "Default";   // assign only if null/undefined
name2 ||= "Guest";     // assign if falsy
name2 &&= name2.trim(); // assign if truthy

// -- OBJECT SHORTHAND -----------------------------------------
const x2 = 1, y2 = 2;
const point = { x2, y2 };  // { x2: 1, y2: 2 }`,
      keyPoints: [
        'Destructuring extracts values from arrays/objects in one line',
        'Spread (...) EXPANDS arrays/objects; Rest (...) COLLECTS remaining items',
        'Classes are syntactic sugar -- JS still uses prototype-based inheritance',
        'import/export enables modular code -- use type="module" in HTML',
        'Optional chaining (?.) prevents errors on null/undefined property access',
      ],
    },
    {
      id: 'js_async',
      languageId: 'javascript',
      title: 'Async JavaScript -- Promises & async/await',
      description: 'Understand the event loop, callbacks, Promises, and async/await for handling asynchronous operations.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 14,
      stages: makeStages(),
      learningContent: `// JavaScript is SINGLE-THREADED but handles async via the Event Loop

// -- CALLBACKS -- the old way (leads to "callback hell") --------
setTimeout(() => console.log("3 seconds later"), 3000);
setInterval(() => console.log("every second"), 1000);

// Callback hell (hard to read):
getData(function(a) {
  getMore(a, function(b) {
    getEvenMore(b, function(c) {
      // deeply nested -> hard to maintain
    });
  });
});

// -- PROMISES -- cleaner async handling ------------------------
// A Promise has 3 states: pending -> fulfilled OR rejected

const myPromise = new Promise((resolve, reject) => {
  const success = true;
  if (success) resolve("Data loaded!");
  else reject("Error occurred");
});

myPromise
  .then(data => console.log(data))        // on success
  .catch(err => console.error(err))       // on failure
  .finally(() => console.log("Done"));    // always runs

// Chaining promises
fetch("https://api.example.com/user")
  .then(response => response.json())      // parse JSON
  .then(user => console.log(user.name))  // use data
  .catch(err => console.error(err));

// -- Promise combinators ---------------------------------------
// Promise.all -- run multiple in PARALLEL, wait for ALL
const [user, posts] = await Promise.all([
  fetchUser(1),
  fetchPosts(1),
]);

// Promise.race -- resolve/reject as soon as ONE finishes
const fastest = await Promise.race([fetch(url1), fetch(url2)]);

// Promise.allSettled -- get all results regardless of success/failure
const results = await Promise.allSettled([p1, p2, p3]);

// -- async/await -- modern, readable async code -----------------
async function fetchUser(id) {
  try {
    const response = await fetch(\`/api/users/\${id}\`);

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}\`);
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    throw error;  // re-throw so callers can handle it
  }
}

// Calling async functions
const user = await fetchUser(1);          // inside async function
fetchUser(1).then(u => console.log(u));   // outside: use .then()

// Async with loop (sequential)
for (const id of [1, 2, 3]) {
  const user = await fetchUser(id);  // waits for each
}

// Async with loop (parallel -- much faster)
const users = await Promise.all([1, 2, 3].map(id => fetchUser(id)));

// -- EVENT LOOP visual -----------------------------------------
console.log("1: Start");
setTimeout(() => console.log("3: Timeout"), 0);
Promise.resolve().then(() => console.log("2: Microtask"));
console.log("4: End");
// Output order: 1, 4, 2, 3
// Microtasks (Promises) run BEFORE macrotasks (setTimeout)`,
      keyPoints: [
        'JS is single-threaded; async operations go to Web APIs and return via the event loop',
        'async/await is syntactic sugar over Promises -- always use try/catch with await',
        'Promise.all() runs tasks in parallel (faster); sequential await runs one by one',
        'await can only be used inside async functions (or top-level modules)',
        'Microtasks (Promise .then) always run before macrotasks (setTimeout)',
      ],
    },
    {
      id: 'js_error_handling',
      languageId: 'javascript',
      title: 'Error Handling & Debugging',
      description: 'Handle runtime errors with try/catch/finally, create custom errors, and use browser DevTools effectively.',
      estimatedTime: 35,
      difficulty: 'Intermediate',
      order: 15,
      stages: makeStages(),
      learningContent: `// -- try / catch / finally ------------------------------------
try {
  // Risky code goes here
  const data = JSON.parse("invalid json {");  // throws SyntaxError
  console.log(data);
} catch (error) {
  // error is an Error object
  console.log(error.name);     // "SyntaxError"
  console.log(error.message);  // "Unexpected token..."
  console.log(error.stack);    // full stack trace
} finally {
  // Always runs -- good for cleanup
  console.log("Parsing attempt finished");
}

// -- BUILT-IN Error types --------------------------------------
// TypeError    -- wrong type (null.property, undefined is not a function)
// ReferenceError -- variable not defined
// SyntaxError  -- invalid JS syntax (caught before execution)
// RangeError   -- number out of range (new Array(-1))
// URIError     -- malformed URI

// -- throw -- create your own errors ---------------------------
function divide(a, b) {
  if (b === 0) throw new Error("Cannot divide by zero");
  if (typeof a !== "number") throw new TypeError("a must be a number");
  return a / b;
}

try {
  console.log(divide(10, 0));
} catch (e) {
  console.error(e.message);  // "Cannot divide by zero"
}

// -- CUSTOM Error classes --------------------------------------
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(status, url) {
    super(\`HTTP \${status} at \${url}\`);
    this.name = "NetworkError";
    this.status = status;
  }
}

try {
  throw new ValidationError("email", "Invalid email format");
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(\`Validation failed on \${e.field}: \${e.message}\`);
  } else {
    throw e;  // re-throw unknown errors
  }
}

// -- Async error handling --------------------------------------
async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new NetworkError(res.status, url);
    return await res.json();
  } catch (e) {
    if (e instanceof NetworkError) {
      console.error("Network issue:", e.message);
    } else {
      console.error("Unexpected:", e.message);
    }
    return null;
  }
}

// -- DEBUGGING techniques --------------------------------------
// console methods
console.log("info");
console.warn("warning -- yellow in DevTools");
console.error("error -- red in DevTools");
console.table([{ name:"a", val:1 },{ name:"b", val:2 }]);  // table view
console.group("Group"); console.log("inside"); console.groupEnd();
console.time("myTimer"); /* code */ console.timeEnd("myTimer");

// debugger statement -- pauses execution in DevTools
function buggyFn(x) {
  debugger;  // DevTools stops here if open
  return x * 2;
}

// Defensive programming
const data = null;
const name = data?.user?.name ?? "Unknown";  // safe access
const arr = Array.isArray(input) ? input : [];  // guard type`,
      keyPoints: [
        'try/catch/finally: try = risky code, catch = handle error, finally = always runs',
        'throw creates an error; instanceof checks which error type you caught',
        'Create custom error classes extending Error for domain-specific errors',
        'Re-throw errors you can\'t handle: throw e inside catch',
        'console.table(), console.time() and debugger are powerful DevTools allies',
      ],
    },
  ],

  // --- C -- SASTRA Syllabus: Problem Solving & Programming ----------------------
  c: [
    // UNIT I -- Algorithms, C Intro, Data Types, Operators, Control Flow, Loops
    {
      id: 'c_intro',
      languageId: 'c',
      title: 'Introduction to C & Algorithms',
      description: 'Understand algorithms, flowcharts, and write your first C program.',
      estimatedTime: 30,
      difficulty: 'Intermediate',
      order: 1,
      stages: makeStages(),
      learningContent: `// A C program structure:
#include <stdio.h>    // Header file for printf/scanf

int main() {
    printf("Hello, World!\\n");  // Output
    return 0;                    // Exit code: 0 = success
}

// Algorithm = step-by-step solution to a problem
// Example: Algorithm to find sum of two numbers
// Step 1: Start
// Step 2: Read A, B
// Step 3: Sum = A + B
// Step 4: Print Sum
// Step 5: Stop

// Flowchart symbols:
// Oval        = Start / Stop
// Rectangle   = Process (computation)
// Diamond     = Decision (if/else)
// Parallelogram = Input / Output
// Arrow       = Flow of control

// printf -- formatted output
printf("Name: %s, Age: %d, GPA: %.2f\\n", name, age, gpa);

// Format specifiers:
// %d  int        %f  float
// %lf double     %c  char
// %s  string     %p  pointer address

// scanf -- formatted input
int age;
scanf("%d", &age);   // & = address-of operator

// Compile and run:
// gcc program.c -o program
// ./program`,
      keyPoints: [
        'Every C program starts execution from the main() function',
        '#include adds header files that provide built-in functions',
        'printf prints formatted output; scanf reads formatted input',
        'An algorithm is a finite, step-by-step solution to a problem',
        'C programs must be compiled before running (gcc program.c -o program)',
      ],
    },
    {
      id: 'c_variables',
      languageId: 'c',
      title: 'Data Types & Variables',
      description: 'Understand C\'s type system: int, float, char, double, and constants.',
      estimatedTime: 35,
      difficulty: 'Intermediate',
      order: 2,
      stages: makeStages(),
      learningContent: `// Declaring variables (type name = value)
int age = 25;
float pi = 3.14f;
double precise = 3.14159265358979;
char grade = 'A';
char name[] = "Alice";  // string = char array

// Type sizes (typical 64-bit system):
// char   -- 1 byte   (-128 to 127)
// int    -- 4 bytes  (~-2 billion to +2 billion)
// float  -- 4 bytes  (6-7 decimal digits precision)
// double -- 8 bytes  (15-16 decimal digits precision)

// Constants (cannot be changed after declaration)
const int MAX_STUDENTS = 100;
#define PI 3.14159   // preprocessor constant

// Unsigned -- only non-negative values
unsigned int score = 95;
// unsigned int range: 0 to ~4 billion

// Check size with sizeof operator
printf("int size: %zu bytes\\n", sizeof(int));

// Type conversion (casting)
int x = (int)3.99;         // x = 3 (truncates decimal)
float y = (float)5 / 2;    // y = 2.5 (not 2!)`,
      keyPoints: [
        'C requires explicit type declarations before using variables',
        'int for integers, float/double for decimals, char for characters',
        'const and #define create constants that cannot be changed',
        'sizeof() returns the memory size of a data type in bytes',
        'Type casting: (int)3.99 converts float to int (truncates)',
      ],
    },
    {
      id: 'c_operators',
      languageId: 'c',
      title: 'Operators in C',
      description: 'Use arithmetic, relational, logical, bitwise, and increment/decrement operators.',
      estimatedTime: 35,
      difficulty: 'Intermediate',
      order: 3,
      stages: makeStages(),
      learningContent: `// Arithmetic operators
+  -  *  /  %   // add, subtract, multiply, divide, modulo
5 / 2   // = 2  (integer division -- truncates!)
5.0 / 2 // = 2.5
10 % 3  // = 1  (remainder)

// Relational operators (return 0 or 1)
==  !=  >  <  >=  <=

// Logical operators
&&   // AND -- true if BOTH are true
||   // OR  -- true if EITHER is true
!    // NOT -- reverses the condition

// Increment/Decrement
x++;   // post-increment (use value, then add 1)
++x;   // pre-increment  (add 1, then use value)
x--;   // post-decrement
--x;   // pre-decrement

// Assignment operators
=  +=  -=  *=  /=  %=

// Bitwise operators (operate on binary bits)
&   |   ^   ~   <<   >>

// Ternary / conditional operator
int max = (a > b) ? a : b;
// same as: if(a>b) max=a; else max=b;

// Operator precedence (high to low):
// ()  >  ++ --  >  * / %  >  + -  >  < > >= <=  >  == !=  >  &&  >  ||`,
      keyPoints: [
        'Integer division (5/2 = 2) truncates; use 5.0/2 to get 2.5',
        '% gives the remainder: 10 % 3 = 1',
        '++x increments before use; x++ increments after use',
        'Logical operators: && is AND, || is OR, ! is NOT',
        'Ternary: condition ? value_if_true : value_if_false',
      ],
    },
    {
      id: 'c_control_flow',
      languageId: 'c',
      title: 'Decision Control Structures',
      description: 'Use if/else and switch statements to control program flow in C.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 4,
      stages: makeStages(),
      learningContent: `// if-else if-else
int marks = 85;
if (marks >= 90) {
    printf("Grade: A\\n");
} else if (marks >= 75) {
    printf("Grade: B\\n");
} else if (marks >= 60) {
    printf("Grade: C\\n");
} else {
    printf("Grade: F\\n");
}

// Nested if
if (age >= 18) {
    if (has_id) {
        printf("Access granted\\n");
    } else {
        printf("Need ID card\\n");
    }
}

// switch statement -- for discrete values
int day = 3;
switch (day) {
    case 1: printf("Monday");    break;
    case 2: printf("Tuesday");   break;
    case 3: printf("Wednesday"); break;
    case 7: printf("Sunday");    break;
    default: printf("Invalid day");
}
// break is MANDATORY to prevent fall-through!
// Without break, execution continues to next case`,
      keyPoints: [
        'if-else if-else handles multiple conditions in sequence',
        'Curly braces {} define the block of code for each condition',
        'switch compares one variable to multiple constant values',
        'break in switch prevents fall-through to the next case',
        'default in switch handles values not matched by any case',
      ],
    },
    {
      id: 'c_loops',
      languageId: 'c',
      title: 'Loops in C',
      description: 'Repeat actions using for, while, and do-while loops with break and continue.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 5,
      stages: makeStages(),
      learningContent: `// for loop -- best when iteration count is known
for (int i = 0; i < 5; i++) {
    printf("%d\\n", i);
}
// Syntax: for(initialization; condition; update)

// while loop -- best when condition-driven
int count = 0;
while (count < 5) {
    printf("%d\\n", count);
    count++;
}

// do-while loop -- always executes body AT LEAST ONCE
int n;
do {
    printf("Enter a positive number: ");
    scanf("%d", &n);
} while (n <= 0);

// break -- exit the loop immediately
for (int i = 0; i < 10; i++) {
    if (i == 5) break;        // stops at 5
    printf("%d ", i);         // prints: 0 1 2 3 4
}

// continue -- skip rest of current iteration
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0) continue; // skip even numbers
    printf("%d ", i);         // prints: 1 3 5 7 9
}

// Nested loops -- multiplication table
for (int i = 1; i <= 5; i++)
    for (int j = 1; j <= 5; j++)
        printf("%4d", i * j);`,
      keyPoints: [
        'for loop: init; condition; update -- best when iteration count is known',
        'while loop: best when condition-driven, count unknown in advance',
        'do-while: always executes body at least once before checking condition',
        'break exits the loop; continue skips to next iteration',
        'Nested loops: inner loop runs completely for each outer iteration',
      ],
    },
    // UNIT II -- Functions & Arrays
    {
      id: 'c_functions',
      languageId: 'c',
      title: 'Functions in C',
      description: 'Define and call functions; understand prototypes, pass-by-value, and pass-by-pointer.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 6,
      stages: makeStages(),
      learningContent: `// Function prototype (declaration)
int add(int a, int b);

int main() {
    int result = add(3, 4);    // Call
    printf("Sum = %d\\n", result);
    return 0;
}

// Function definition
int add(int a, int b) {
    return a + b;
}

// void function -- no return value
void greet(char *name) {
    printf("Hello, %s!\\n", name);
}

// Pass-by-value -- original variable unchanged
void doubleIt(int x) {
    x *= 2;    // only changes local copy
}

// Pass-by-pointer -- modifies the original!
void doublePtr(int *x) {
    *x *= 2;   // modifies value at address
}

int n = 5;
doublePtr(&n);   // n is now 10

// Recursive function -- calls itself
int factorial(int n) {
    if (n <= 1) return 1;           // base case
    return n * factorial(n - 1);   // recursive case
}
// factorial(5) = 5*4*3*2*1 = 120`,
      keyPoints: [
        'Functions must be declared (prototype) before use, or defined above main()',
        'Return type void means the function returns nothing',
        'C passes arguments by value -- the original variable is NOT changed',
        'Pass a pointer (&var) to let a function modify the original variable',
        'Recursive functions call themselves -- must have a base case to stop',
      ],
    },
    {
      id: 'c_arrays',
      languageId: 'c',
      title: 'Arrays in C',
      description: 'Store and manipulate fixed-size collections of same-type data with arrays.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 7,
      stages: makeStages(),
      learningContent: `// 1D Array declaration and initialization
int marks[5] = {85, 90, 78, 92, 88};
marks[0] = 95;             // Modify element
printf("%d\\n", marks[2]); // Access element (0-indexed)

// Loop through array
for (int i = 0; i < 5; i++) {
    printf("%d ", marks[i]);
}

// Array without initialization (undefined values!)
int scores[10];   // contains garbage values

// Array as function parameter
void printArray(int arr[], int size) {
    for (int i = 0; i < size; i++)
        printf("%d ", arr[i]);
}
// Arrays decay to pointers when passed to functions!

// 2D Array (matrix)
int matrix[3][3] = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};
printf("%d\\n", matrix[1][2]);  // Row 1, Col 2 = 6

// IMPORTANT: C arrays do NOT check bounds!
// Accessing marks[10] is UNDEFINED BEHAVIOR (crash or corruption)`,
      keyPoints: [
        'Arrays store multiple values of the same type in contiguous memory',
        'Indexing starts at 0 -- a 5-element array uses indices 0 to 4',
        'Array size is fixed at declaration and cannot change at runtime',
        'C does not check array bounds -- out-of-bounds access is undefined behavior',
        '2D arrays: matrix[row][col]; used for tables and matrices',
      ],
    },
    // UNIT III -- Strings, Structures & Unions
    {
      id: 'c_strings',
      languageId: 'c',
      title: 'Strings in C',
      description: 'Work with C-style strings: character arrays, null terminator, and string.h functions.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 8,
      stages: makeStages(),
      learningContent: `#include <string.h>

// Strings are char arrays ending with '\\0' (null terminator)
char name[] = "Alice";   // ['A','l','i','c','e','\\0']
char city[20] = "Chennai";

// Input / Output
printf("Name: %s\\n", name);
scanf("%s", name);            // reads until whitespace
fgets(name, 20, stdin);       // reads full line (safer!)

// String functions from <string.h>
strlen(name)                  // length (NOT counting \\0)
strcpy(dest, src)             // copy src into dest
strcat(dest, src)             // append src to end of dest
strcmp(s1, s2)                // compare: 0 if equal, <0 or >0 otherwise
strncpy(dest, src, n)         // copy at most n characters
strncat(dest, src, n)         // append at most n characters
strchr(str, 'a')              // find first 'a' in str
strstr(str, "sub")            // find substring

// String to number conversion (stdlib.h)
int n = atoi("42");           // string -> int
float f = atof("3.14");       // string -> float

// Examples
char s1[20] = "Hello";
char s2[] = " World";
strcat(s1, s2);               // s1 = "Hello World"
printf("Length: %zu\\n", strlen(s1)); // 11`,
      keyPoints: [
        'C strings are char arrays terminated by a null character \'\\0\'',
        'strlen() counts characters NOT including the null terminator',
        'strcpy() copies; strcat() concatenates; strcmp() compares strings',
        'fgets() is safer than scanf() for reading strings with spaces',
        'Always ensure destination array is large enough to hold the string + \\0',
      ],
    },
    {
      id: 'c_structures',
      languageId: 'c',
      title: 'Structures & Unions',
      description: 'Group related data of different types using struct and union in C.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 9,
      stages: makeStages(),
      learningContent: `// struct -- groups different data types together
struct Student {
    char name[50];
    int rollNo;
    float gpa;
};

// Create and use struct variables
struct Student s1;
s1.rollNo = 101;
s1.gpa = 8.5;
strcpy(s1.name, "Alice");

// Struct initialization
struct Student s2 = {"Bob", 102, 9.1};
printf("Name: %s, GPA: %.1f\\n", s2.name, s2.gpa);

// typedef -- create a shorter alias
typedef struct {
    char name[50];
    int age;
} Person;

Person p = {"Alice", 20};  // no need to write 'struct' keyword

// Array of structures
struct Student class[60];
class[0] = s1;
class[1] = s2;

// Pointer to struct -- use arrow operator (->)
Person *ptr = &p;
printf("%s\\n", ptr->name);  // same as (*ptr).name
ptr->age = 21;               // modify via pointer

// union -- members SHARE the same memory location
union Data {
    int i;
    float f;
    char str[20];
};
// Size = size of LARGEST member
// Only ONE member holds valid data at a time!`,
      keyPoints: [
        'struct groups variables of different types under one name',
        'Access struct members using the dot (.) operator',
        'typedef creates a shorter alias name for a struct type',
        'Use arrow (->) operator when accessing struct through a pointer',
        'union shares memory -- only one member holds valid data at a time',
      ],
    },
    // UNIT IV -- Pointers & File Handling
    {
      id: 'c_pointers',
      languageId: 'c',
      title: 'Pointers in C',
      description: 'Understand memory addresses, pointer operations, and dynamic memory allocation.',
      estimatedTime: 60,
      difficulty: 'Advanced',
      order: 10,
      stages: makeStages(),
      learningContent: `// Pointer = variable that stores a memory address
int x = 42;
int *ptr = &x;           // ptr holds the address of x

printf("%p\\n", ptr);    // print the address (e.g. 0x7ffd...)
printf("%d\\n", *ptr);   // dereference: prints 42 (value at address)
*ptr = 100;              // modify x through pointer: x is now 100

// NULL pointer -- pointer to nothing
int *p = NULL;
if (p != NULL) { /* safe to dereference */ }

// Pointer arithmetic
int arr[] = {10, 20, 30};
int *ap = arr;           // points to arr[0]
ap++;                    // now points to arr[1]
printf("%d\\n", *(ap+1)); // arr[2] = 30

// Pointer to struct
struct Student *sptr = &student;
sptr->gpa = 9.0;         // same as (*sptr).gpa

// Dynamic memory allocation (<stdlib.h>)
#include <stdlib.h>

// malloc -- allocate memory on heap
int *nums = (int *)malloc(5 * sizeof(int));
if (nums == NULL) { printf("Allocation failed!"); return 1; }
nums[0] = 100;
free(nums);              // MUST free to avoid memory leak

// calloc -- allocates AND zero-initializes
int *arr2 = (int *)calloc(5, sizeof(int));

// realloc -- resize existing allocation
nums = (int *)realloc(nums, 10 * sizeof(int));`,
      keyPoints: [
        '& gets the address of a variable; * dereferences a pointer (gets its value)',
        'Always initialize pointers -- uninitialized pointers cause crashes (segfault)',
        'NULL pointer check prevents segmentation faults',
        'malloc() allocates heap memory; always call free() to release it',
        'Memory leak: forgetting to free allocated memory causes RAM to fill up',
      ],
    },
    {
      id: 'c_files',
      languageId: 'c',
      title: 'File Handling in C',
      description: 'Read and write files using FILE pointers, fopen, fclose, fprintf, and fscanf.',
      estimatedTime: 45,
      difficulty: 'Advanced',
      order: 11,
      stages: makeStages(),
      learningContent: `#include <stdio.h>

// Open a file -- returns FILE pointer (NULL if failed)
FILE *fp = fopen("data.txt", "w");
if (fp == NULL) {
    printf("Error opening file!\\n");
    return 1;
}

// Write to file
fprintf(fp, "Name: Alice\\n");
fprintf(fp, "Age: %d\\n", 20);
fputs("Hello\\n", fp);          // write string
fputc('A', fp);                 // write single char

fclose(fp);                     // ALWAYS close the file!

// Read from file
fp = fopen("data.txt", "r");
char line[100];
while (fgets(line, sizeof(line), fp) != NULL) {
    printf("%s", line);
}
fclose(fp);

// File modes:
// "r"  -- read only
// "w"  -- write (creates or overwrites)
// "a"  -- append (adds to end)
// "r+" -- read and write
// "rb" -- binary read
// "wb" -- binary write

// fscanf -- read formatted data from file
int age;
fscanf(fp, "Age: %d", &age);

// fseek, ftell -- random access
fseek(fp, 0, SEEK_SET);   // go to beginning of file
fseek(fp, 0, SEEK_END);   // go to end of file`,
      keyPoints: [
        'fopen() opens a file; returns NULL if it fails -- always check the return value!',
        'fprintf() writes formatted data; fgets() reads a line safely',
        'Always call fclose() to flush buffers and release the file handle',
        'File mode "w" creates/overwrites; "a" appends; "r" reads only',
        'Binary files ("rb"/"wb") store raw bytes without text formatting',
      ],
    },
  ],

  // --- C++ -- SASTRA Syllabus: OOP with C++ -------------------------------------
  cpp: [
    // UNIT I -- OOP Introduction, C++ Basics, Functions
    {
      id: 'cpp_oop_intro',
      languageId: 'cpp',
      title: 'OOP Introduction & Principles',
      description: 'Understand the foundations of Object-Oriented Programming and how C++ implements them.',
      estimatedTime: 30,
      difficulty: 'Intermediate',
      order: 1,
      stages: makeStages(),
      learningContent: `// OOP -- Object-Oriented Programming
// Organizes code around objects (real-world entities)

// 4 Pillars of OOP:

// 1. ENCAPSULATION
//    Bundle data and methods together in a class
//    Hide internal details using private members
//    Example: Bank account hides balance, exposes deposit/withdraw

// 2. INHERITANCE
//    A class (child) acquires attributes/methods of another (parent)
//    Promotes code reuse
//    Example: Car inherits from Vehicle; Dog inherits from Animal

// 3. POLYMORPHISM
//    Same function behaves differently for different objects
//    Compile-time: function overloading, operator overloading
//    Runtime: virtual functions

// 4. ABSTRACTION
//    Show only what the user needs; hide the complexity
//    Achieved via abstract classes and interfaces

// Procedure-Oriented vs Object-Oriented:
// POP: top-down, focuses on functions and procedures
//      data flows freely between functions (less secure)
// OOP: focuses on objects containing data + behavior
//      data is protected within objects (more secure)

// Advantages of OOP:
// - Models real-world entities naturally
// - Code reuse through inheritance
// - Easier maintenance and modification
// - Data security through encapsulation`,
      keyPoints: [
        'OOP organizes programs as collections of interacting objects',
        'Encapsulation: bundle data and methods, hide internal implementation',
        'Inheritance: child class reuses and extends the parent class',
        'Polymorphism: same interface, different behavior per object type',
        'Abstraction: expose only essential interface, hide complexity inside',
      ],
    },
    {
      id: 'cpp_basics',
      languageId: 'cpp',
      title: 'C++ Basics & I/O',
      description: 'Get started with C++ syntax, cout, cin, data types, and namespaces.',
      estimatedTime: 35,
      difficulty: 'Intermediate',
      order: 2,
      stages: makeStages(),
      learningContent: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // Output
    cout << "Hello, World!" << endl;

    // Variables & data types
    int age = 20;
    double gpa = 9.1;
    string name = "Alice";
    bool enrolled = true;
    char grade = 'A';

    // Input
    cin >> age;               // single value (stops at whitespace)
    getline(cin, name);       // full line including spaces

    // Multiple outputs
    cout << "Name: " << name << ", Age: " << age << endl;

    // C++ string operations
    cout << name.length() << endl;          // 5
    cout << name.substr(0, 3) << endl;      // first 3 chars
    cout << name + " Smith" << endl;        // concatenation
    cout << (name == "Alice") << endl;      // comparison

    // Type conversion
    int x = (int)3.99;                      // C-style: x = 3
    int y = static_cast<int>(3.99);         // C++ cast (preferred)

    return 0;
}`,
      keyPoints: [
        'cout << for output; cin >> for input; endl for newline + flush',
        'using namespace std; avoids typing std:: prefix everywhere',
        'C++ string class supports .length(), .substr(), +, == operators',
        'getline(cin, str) reads the entire line including spaces',
        'static_cast<type>() is the preferred C++ type casting method',
      ],
    },
    {
      id: 'cpp_functions',
      languageId: 'cpp',
      title: 'Functions in C++',
      description: 'Write functions with default arguments, function overloading, inline, and call by reference.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 3,
      stages: makeStages(),
      learningContent: `// Basic function
int add(int a, int b) { return a + b; }

// Default arguments -- must be at the END
void greet(string name, string msg = "Hello") {
    cout << msg << ", " << name << "!" << endl;
}
greet("Alice");           // Hello, Alice!
greet("Bob", "Hi");       // Hi, Bob!

// Function overloading -- same name, different parameters
int multiply(int a, int b) { return a * b; }
double multiply(double a, double b) { return a * b; }
int multiply(int a, int b, int c) { return a * b * c; }
// Compiler picks the correct version based on argument types!

// Inline function -- compiler replaces call with code (faster for small functions)
inline int square(int x) { return x * x; }

// Call by reference -- modifies the ORIGINAL variable
void swap(int &a, int &b) {
    int temp = a;
    a = b;
    b = temp;
}
int x = 5, y = 10;
swap(x, y);  // x=10, y=5 -- originals changed!

// Call by pointer -- C-style modification
void increment(int *n) { (*n)++; }

// Note: C++ reference (&) is cleaner than pointer for modification`,
      keyPoints: [
        'Function overloading: same name, different parameter types or count',
        'Default arguments make parameters optional -- must be at the rightmost position',
        'inline suggests compiler to replace function call with its code body',
        'Call by reference (int &a) lets the function modify the original variable',
        'C++ reference variables (&) provide a cleaner alternative to pointers',
      ],
    },
    // UNIT II -- Classes, Arrays/Strings, Templates
    {
      id: 'cpp_classes',
      languageId: 'cpp',
      title: 'Classes & Objects',
      description: 'Define classes with data members, member functions, constructors, and destructors.',
      estimatedTime: 60,
      difficulty: 'Intermediate',
      order: 4,
      stages: makeStages(),
      learningContent: `class Rectangle {
private:                          // accessible only within class
    double width, height;

public:                           // accessible from outside
    // Constructor -- called when object is created
    Rectangle(double w, double h) : width(w), height(h) {
        cout << "Rectangle created!" << endl;
    }

    // Copy constructor
    Rectangle(const Rectangle &r) : width(r.width), height(r.height) {}

    // Member functions
    double area() const { return width * height; }
    double perimeter() const { return 2 * (width + height); }

    // Getter and Setter
    void setWidth(double w) { width = w; }
    double getWidth() const { return width; }

    // Destructor -- called when object goes out of scope
    ~Rectangle() {
        cout << "Rectangle destroyed!" << endl;
    }
};

// Create objects
Rectangle r1(5.0, 3.0);
Rectangle r2 = r1;            // uses copy constructor
cout << r1.area() << endl;    // 15

// static member -- shared across ALL objects
class Counter {
    static int count;
public:
    Counter() { count++; }
    static int getCount() { return count; }
};
int Counter::count = 0;       // define static member outside`,
      keyPoints: [
        'private members are accessible only within the class (encapsulation)',
        'Constructor has the same name as the class and no return type',
        'Destructor (~ClassName) is called automatically when object is destroyed',
        'const methods promise not to modify any member variables',
        'static members are shared across all instances of the class',
      ],
    },
    {
      id: 'cpp_arrays_strings',
      languageId: 'cpp',
      title: 'Arrays & Strings in C++',
      description: 'Work with arrays and the C++ string class; use vectors as dynamic arrays.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 5,
      stages: makeStages(),
      learningContent: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// C-style arrays (fixed size)
int marks[5] = {85, 90, 78, 92, 88};

// C++ string class (safer and more powerful than char arrays)
string name = "Alice";
cout << name.length() << endl;          // 5
cout << name.at(0) << endl;            // 'A' (bounds-checked)
cout << name.substr(0, 3) << endl;     // "Ali"
name += " Smith";                       // concatenation
name.find("Ali");                       // returns index 0
name.replace(0, 5, "Bob");             // replace chars
name.compare("Alice");                 // 0 if equal

// String comparison (direct operators!)
if (name == "Bob Smith") { cout << "Match!" << endl; }

// vector -- dynamic array (size can grow or shrink)
vector<int> scores = {85, 90, 78};
scores.push_back(95);                   // add to end
scores.pop_back();                      // remove last
cout << scores.size() << endl;         // 3
cout << scores[0] << endl;             // 85

// Range-based for loop (C++11 and later)
for (int s : scores) {
    cout << s << " ";
}

// 2D vector
vector<vector<int>> matrix(3, vector<int>(3, 0));`,
      keyPoints: [
        'C++ string class is safer and more powerful than C char arrays',
        'string supports +, ==, !=, <, > operators directly',
        '.find() returns the index; .substr(start, len) extracts a substring',
        'vector is a dynamic array -- grows automatically with push_back()',
        'Range-based for (for x : container) iterates cleanly over any container',
      ],
    },
    {
      id: 'cpp_templates',
      languageId: 'cpp',
      title: 'Templates',
      description: 'Write generic, reusable code that works with any data type using templates.',
      estimatedTime: 50,
      difficulty: 'Advanced',
      order: 6,
      stages: makeStages(),
      learningContent: `// Function template -- works for any type T
template <typename T>
T maximum(T a, T b) {
    return (a > b) ? a : b;
}

int main() {
    cout << maximum(3, 7) << endl;           // int: 7
    cout << maximum(3.14, 2.71) << endl;     // double: 3.14
    cout << maximum('A', 'Z') << endl;       // char: Z
}

// Class template -- generic data structure
template <typename T>
class Stack {
private:
    vector<T> items;
public:
    void push(T item) { items.push_back(item); }
    T pop() {
        T top = items.back();
        items.pop_back();
        return top;
    }
    bool isEmpty() const { return items.empty(); }
    int size() const { return (int)items.size(); }
};

Stack<int> intStack;
intStack.push(10);
intStack.push(20);
cout << intStack.pop() << endl;    // 20

Stack<string> strStack;
strStack.push("hello");
strStack.push("world");

// Template specialization -- custom behavior for a specific type
template <>
string maximum<string>(string a, string b) {
    return (a.length() > b.length()) ? a : b;
}`,
      keyPoints: [
        'Templates enable writing generic code that works with any data type',
        'typename T is a placeholder -- replaced by the actual type when called',
        'The compiler generates separate code for each type used (compile-time)',
        'Class templates create generic data structures (Stack<int>, Stack<string>)',
        'Template specialization allows custom behavior for a specific type',
      ],
    },
    // UNIT III -- Operator Overloading & Inheritance
    {
      id: 'cpp_operator_overloading',
      languageId: 'cpp',
      title: 'Operator Overloading',
      description: 'Redefine operators (+, -, ==, <<) to work naturally with user-defined classes.',
      estimatedTime: 50,
      difficulty: 'Advanced',
      order: 7,
      stages: makeStages(),
      learningContent: `class Complex {
private:
    double real, imag;

public:
    Complex(double r = 0, double i = 0) : real(r), imag(i) {}

    // Overload + operator
    Complex operator+(const Complex &other) const {
        return Complex(real + other.real, imag + other.imag);
    }

    // Overload - operator
    Complex operator-(const Complex &other) const {
        return Complex(real - other.real, imag - other.imag);
    }

    // Overload == operator
    bool operator==(const Complex &other) const {
        return real == other.real && imag == other.imag;
    }

    // Overload << for cout output (friend function)
    friend ostream& operator<<(ostream &os, const Complex &c) {
        os << c.real << " + " << c.imag << "i";
        return os;
    }

    // Overload ++ (prefix)
    Complex& operator++() {
        real++;
        return *this;
    }
};

Complex c1(3, 4), c2(1, 2);
Complex c3 = c1 + c2;          // calls operator+
cout << c3 << endl;             // calls operator<< -> "4 + 6i"
cout << (c1 == c2) << endl;     // calls operator==

// Operators that CAN be overloaded:
// + - * / % == != < > <= >= += -= << >> [] () ->

// Operators that CANNOT be overloaded:
// :: (scope resolution), . (member access), .* sizeof typeid`,
      keyPoints: [
        'Operator overloading gives custom meaning to operators for user-defined classes',
        'Syntax: return_type operator+(const ClassName &other)',
        'friend functions can access private members from outside the class',
        'operator<< and operator>> are overloaded for stream I/O (cout, cin)',
        'Cannot overload ::, . (dot), .*, sizeof, typeid operators',
      ],
    },
    {
      id: 'cpp_inheritance',
      languageId: 'cpp',
      title: 'Inheritance',
      description: 'Build class hierarchies using single, multilevel, and multiple inheritance in C++.',
      estimatedTime: 55,
      difficulty: 'Advanced',
      order: 8,
      stages: makeStages(),
      learningContent: `// Base class
class Animal {
protected:
    string name;   // accessible in derived classes
public:
    Animal(string n) : name(n) {}
    void eat() { cout << name << " eats." << endl; }
    virtual void speak() { cout << "..." << endl; }
};

// Single inheritance: Dog is-an Animal
class Dog : public Animal {
public:
    Dog(string n) : Animal(n) {}          // call base constructor
    void speak() override {               // override virtual method
        cout << name << " says: Woof!" << endl;
    }
    void fetch() { cout << name << " fetches!" << endl; }
};

// Multilevel inheritance: Poodle -> Dog -> Animal
class Poodle : public Dog {
public:
    Poodle(string n) : Dog(n) {}
    void speak() override {
        cout << name << " says: Yip!" << endl;
    }
};

// Multiple inheritance: FlyingDog inherits from both
class Flyable { public: void fly() { cout << "Flying!" << endl; } };
class FlyingDog : public Dog, public Flyable { };

// Hierarchical inheritance: multiple classes from same base
class Cat : public Animal { };

// Access specifiers in inheritance:
// public    inherited as public (is-a relationship)
// protected inherited as protected
// private   all members become private (has-a relationship)`,
      keyPoints: [
        'public inheritance creates an "is-a" relationship (Dog is an Animal)',
        'Child constructor calls parent constructor via member initializer list',
        'protected members are accessible in derived classes but not from outside',
        'virtual + override enables runtime polymorphism',
        'Multiple inheritance: class C : public A, public B',
      ],
    },
    // UNIT IV -- Memory Management, Virtual Functions, Streams & Files
    {
      id: 'cpp_memory',
      languageId: 'cpp',
      title: 'Memory Management',
      description: 'Allocate and free dynamic memory using new and delete in C++.',
      estimatedTime: 45,
      difficulty: 'Advanced',
      order: 9,
      stages: makeStages(),
      learningContent: `// new -- allocate on heap; delete -- free it
int *p = new int;         // allocate one int
*p = 42;
delete p;                 // free single object -- use delete
p = nullptr;              // good practice: avoid dangling pointer

// Arrays on heap
int *arr = new int[10];   // allocate array of 10 ints
arr[0] = 100;
delete[] arr;             // free array -- use delete[] (NOT delete!)

// new with initialization
int *x = new int(99);           // *x = 99
double *d = new double[5]();    // zero-initialized array

// Smart pointers (C++11) -- auto-manage memory, no manual delete!
#include <memory>

unique_ptr<int> up = make_unique<int>(42);
// auto-deleted when 'up' goes out of scope

shared_ptr<int> sp1 = make_shared<int>(10);
shared_ptr<int> sp2 = sp1;    // reference count = 2
// deleted when LAST shared_ptr goes out of scope

// Memory issues to AVOID:
// Memory leak:    using new without delete (RAM fills up)
// Dangling ptr:   using pointer after delete (undefined behavior)
// Double delete:  calling delete twice on same pointer (crash)
// Buffer overflow: writing beyond allocated size (crash/security bug)

// Rule of Three (if you write one, write all three):
// Destructor, Copy Constructor, Copy Assignment Operator`,
      keyPoints: [
        'new allocates heap memory; delete frees it -- they must always be paired',
        'Use delete[] (not delete) to free arrays allocated with new[]',
        'Memory leak: forgetting delete causes the program to consume more RAM over time',
        'Dangling pointer: using a pointer after its memory has been freed -- undefined behavior',
        'Smart pointers (unique_ptr, shared_ptr) automatically prevent memory leaks',
      ],
    },
    {
      id: 'cpp_virtual',
      languageId: 'cpp',
      title: 'Virtual Functions & Polymorphism',
      description: 'Implement runtime polymorphism with virtual functions, pure virtual, and abstract classes.',
      estimatedTime: 50,
      difficulty: 'Advanced',
      order: 10,
      stages: makeStages(),
      learningContent: `// Abstract base class -- has at least one pure virtual function
class Shape {
public:
    virtual double area() = 0;   // pure virtual -- MUST override
    virtual void draw() = 0;

    // Non-virtual function shared by all
    void describe() {
        cout << "This shape has area = " << area() << endl;
    }

    virtual ~Shape() {}          // ALWAYS virtual destructor!
};

class Circle : public Shape {
    double radius;
public:
    Circle(double r) : radius(r) {}
    double area() override { return 3.14159 * radius * radius; }
    void draw() override { cout << "Drawing circle" << endl; }
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double w, double h) : w(w), h(h) {}
    double area() override { return w * h; }
    void draw() override { cout << "Drawing rectangle" << endl; }
};

// Runtime polymorphism via BASE CLASS POINTER
Shape *shapes[2];
shapes[0] = new Circle(5);
shapes[1] = new Rectangle(4, 6);

for (int i = 0; i < 2; i++) {
    shapes[i]->draw();          // calls Circle::draw() or Rectangle::draw()
    shapes[i]->describe();      // uses the correct area() at runtime
    delete shapes[i];
}

// Shape s;  // ERROR: cannot instantiate abstract class!`,
      keyPoints: [
        'virtual function: base class declares, derived class overrides for runtime dispatch',
        'Pure virtual (= 0) makes the function mandatory to override in derived classes',
        'Abstract class: has at least one pure virtual function -- cannot be instantiated',
        'Runtime polymorphism: base class pointer automatically calls the correct derived method',
        'Always declare virtual destructor in base class to prevent memory leaks',
      ],
    },
    {
      id: 'cpp_streams',
      languageId: 'cpp',
      title: 'Streams & File Handling',
      description: 'Read and write files using fstream, ifstream, and ofstream in C++.',
      estimatedTime: 45,
      difficulty: 'Advanced',
      order: 11,
      stages: makeStages(),
      learningContent: `#include <fstream>
#include <iostream>
#include <string>
using namespace std;

// Writing to a file (ofstream -- output file stream)
ofstream outFile("data.txt");
if (!outFile) {
    cerr << "Cannot open file for writing!" << endl;
    return 1;
}
outFile << "Name: Alice" << endl;
outFile << "Age: " << 20 << endl;
outFile.close();

// Reading from a file (ifstream -- input file stream)
ifstream inFile("data.txt");
if (!inFile) {
    cerr << "Cannot open file for reading!" << endl;
    return 1;
}
string line;
while (getline(inFile, line)) {
    cout << line << endl;
}
inFile.close();

// Read and Write (fstream)
fstream file("data.txt", ios::in | ios::app);

// File open modes (flags):
// ios::in    -- read
// ios::out   -- write (overwrite)
// ios::app   -- append
// ios::ate   -- seek to end on open
// ios::binary -- binary mode

// Binary file I/O -- write struct directly to file
struct Student { char name[50]; int age; float gpa; };
Student s = {"Alice", 20, 9.1f};

ofstream binOut("students.bin", ios::binary);
binOut.write(reinterpret_cast<char*>(&s), sizeof(s));
binOut.close();

ifstream binIn("students.bin", ios::binary);
Student loaded;
binIn.read(reinterpret_cast<char*>(&loaded), sizeof(loaded));
cout << loaded.name << " " << loaded.gpa << endl;`,
      keyPoints: [
        'ifstream reads from files; ofstream writes; fstream does both',
        'Always check if file opened successfully: if (!file) { handle error }',
        'Always call .close() when done; destructor also closes it automatically',
        'getline() reads full lines from files including spaces',
        'Binary mode (ios::binary) reads/writes raw bytes without text formatting',
      ],
    },
  ],

  // --- Java (SASTRA Syllabus) ---------------------------------------------------
  java: [
    // -- UNIT I ------------------------------------------------------------------
    {
      id: 'java_intro',
      languageId: 'java',
      title: 'Introduction to Java',
      description: 'History, evolution, features of Java, JDK, JVM, and your first program.',
      estimatedTime: 35,
      difficulty: 'Beginner',
      order: 1,
      stages: makeStages(),
      learningContent: `// Your first Java program
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}

Java was created by James Gosling at Sun Microsystems in 1995.
Key features: Platform-independent, Object-Oriented, Secure, Robust.

JDK  -> Java Development Kit  (compile + run)
JRE  -> Java Runtime Environment (run only)
JVM  -> Java Virtual Machine  (executes bytecode)

Compile:  javac HelloWorld.java  -> produces HelloWorld.class
Run:      java HelloWorld        -> JVM executes the bytecode`,
      keyPoints: [
        'Java was created by James Gosling at Sun Microsystems in 1995',
        'Write Once, Run Anywhere -- JVM executes on any platform',
        'JDK compiles source code; JVM runs the bytecode (.class file)',
        'Every Java program must have a main method as entry point',
        'Java is strongly typed, object-oriented, and memory-safe',
      ],
    },
    {
      id: 'java_datatypes',
      languageId: 'java',
      title: 'Data Types, Variables & Arrays',
      description: 'Primitive types, variable declarations, type casting, and arrays in Java.',
      estimatedTime: 40,
      difficulty: 'Beginner',
      order: 2,
      stages: makeStages(),
      learningContent: `// Primitive data types
int age = 21;          // 4 bytes, whole numbers
double gpa = 9.2;      // 8 bytes, decimal numbers
char grade = 'A';      // 2 bytes, single character
boolean isPassed = true; // true or false
long population = 8000000000L; // large numbers

// Type casting
int x = (int) 3.99;   // 3 (truncates decimal)
double d = (double) 5 / 2; // 2.5 (not 2)

// Arrays
int[] marks = {85, 90, 78, 92};   // 1D array
int[][] matrix = new int[3][3];    // 2D array

System.out.println(marks[0]);      // 85
System.out.println(marks.length);  // 4`,
      keyPoints: [
        'Primitive types: byte, short, int, long, float, double, char, boolean',
        'Variables must be declared with a type before use',
        'Type casting: (int)3.99 truncates to 3',
        'Arrays are fixed-size, same-type, zero-indexed collections',
        '2D arrays: int[rows][cols] for matrices and tables',
      ],
    },
    {
      id: 'java_operators',
      languageId: 'java',
      title: 'Operators & Expressions',
      description: 'Arithmetic, relational, logical, bitwise, and assignment operators in Java.',
      estimatedTime: 30,
      difficulty: 'Beginner',
      order: 3,
      stages: makeStages(),
      learningContent: `// Arithmetic operators
int a = 10, b = 3;
System.out.println(a + b);   // 13
System.out.println(a / b);   // 3  (integer division!)
System.out.println(a % b);   // 1  (remainder)
System.out.println(a++);     // 10 (post-increment: uses then increments)
System.out.println(++a);     // 12 (pre-increment: increments then uses)

// Relational & logical
boolean result = (a > 5) && (b < 10);  // true
boolean either = (a > 20) || (b < 10); // true
boolean flip   = !(a > 5);             // false

// Ternary operator
String pass = (marks >= 50) ? "Pass" : "Fail";

// Assignment operators
a += 5;  // a = a + 5
a *= 2;  // a = a * 2`,
      keyPoints: [
        'Integer division: 10/3 = 3, not 3.33 -- use double for decimals',
        '% gives remainder: 10%3 = 1 (modulo)',
        'Pre-increment (++x) increments first, then returns; post-increment (x++) returns first',
        'Logical: && (AND), || (OR), ! (NOT)',
        'Ternary: condition ? valueIfTrue : valueIfFalse',
      ],
    },
    {
      id: 'java_control',
      languageId: 'java',
      title: 'Control Statements',
      description: 'if-else, switch-case, for, while, do-while, break, and continue.',
      estimatedTime: 40,
      difficulty: 'Beginner',
      order: 4,
      stages: makeStages(),
      learningContent: `// if-else
int score = 75;
if (score >= 90) {
    System.out.println("Grade: O");
} else if (score >= 75) {
    System.out.println("Grade: A");
} else {
    System.out.println("Grade: B");
}

// switch-case
switch (day) {
    case 1: System.out.println("Monday"); break;
    case 2: System.out.println("Tuesday"); break;
    default: System.out.println("Other");
}

// Loops
for (int i = 1; i <= 5; i++) { System.out.print(i + " "); }

int n = 1;
while (n <= 5) { System.out.print(n++); }

do {
    System.out.println("Runs at least once");
} while (false);`,
      keyPoints: [
        'if / else if / else for conditional branching',
        'switch-case for matching discrete values -- always use break!',
        'for loop: best when number of iterations is known',
        'while loop: runs while condition is true (may run 0 times)',
        'do-while: guaranteed to run at least once',
      ],
    },
    {
      id: 'java_classes',
      languageId: 'java',
      title: 'Methods & Classes',
      description: 'Define classes, constructors, methods, and understand encapsulation.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 5,
      stages: makeStages(),
      learningContent: `public class Student {
    // Instance variables (encapsulated)
    private String name;
    private int rollNo;
    private double cgpa;

    // Constructor
    public Student(String name, int rollNo, double cgpa) {
        this.name = name;
        this.rollNo = rollNo;
        this.cgpa = cgpa;
    }

    // Methods
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public void display() {
        System.out.println(rollNo + ": " + name + " - " + cgpa);
    }

    // Static method -- belongs to class, not object
    public static String getCollegeName() {
        return "SASTRA University";
    }
}

// Using the class
Student s = new Student("Rahul", 101, 9.2);
s.display();
System.out.println(Student.getCollegeName());`,
      keyPoints: [
        'Class is a blueprint; object is an instance created with new',
        'Constructor has the same name as class and no return type',
        'this refers to the current object instance',
        'Encapsulation: private fields + public getters/setters',
        'static members belong to the class, not individual objects',
      ],
    },
    {
      id: 'java_interfaces',
      languageId: 'java',
      title: 'Interfaces & Packages',
      description: 'Define contracts with interfaces, organize code with packages.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 6,
      stages: makeStages(),
      learningContent: `// Interface -- defines a contract
interface Shape {
    double area();           // abstract by default
    double perimeter();      // must be implemented
    default void display() { // default method (Java 8+)
        System.out.println("Area: " + area());
    }
}

// Class implementing interface
class Circle implements Shape {
    double radius;
    Circle(double r) { this.radius = r; }

    public double area() { return Math.PI * radius * radius; }
    public double perimeter() { return 2 * Math.PI * radius; }
}

// A class can implement multiple interfaces
class Square implements Shape, Printable { ... }

// Packages organize related classes
package com.sastra.university;
import java.util.ArrayList;  // import from java.util package`,
      keyPoints: [
        'Interface is a pure contract -- defines what to do, not how',
        'A class implements an interface using the implements keyword',
        'A class can implement multiple interfaces (unlike inheritance)',
        'Packages group related classes -- like folders for .java files',
        'import statement brings classes from other packages into scope',
      ],
    },
    {
      id: 'java_exceptions',
      languageId: 'java',
      title: 'Exception Handling',
      description: 'Handle errors gracefully with try-catch-finally and custom exceptions.',
      estimatedTime: 40,
      difficulty: 'Intermediate',
      order: 7,
      stages: makeStages(),
      learningContent: `// Basic exception handling
try {
    int result = 10 / 0;                   // ArithmeticException
    int[] arr = new int[3];
    arr[10] = 5;                           // ArrayIndexOutOfBoundsException
} catch (ArithmeticException e) {
    System.out.println("Math error: " + e.getMessage());
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("Array error!");
} finally {
    System.out.println("This always runs -- cleanup here!");
}

// Custom exception
class InsufficientMarksException extends Exception {
    InsufficientMarksException(String msg) { super(msg); }
}

// Throwing a custom exception
void checkEligibility(int marks) throws InsufficientMarksException {
    if (marks < 50)
        throw new InsufficientMarksException("Need >= 50 to pass");
}`,
      keyPoints: [
        'try block contains risky code; catch handles specific exceptions',
        'finally block always runs -- ideal for closing resources',
        'Checked exceptions must be caught or declared with throws',
        'RuntimeExceptions (unchecked) are optional to catch',
        'Custom exceptions extend the Exception class',
      ],
    },
    // -- UNIT II -----------------------------------------------------------------
    {
      id: 'java_threads',
      languageId: 'java',
      title: 'Multithreaded Programming',
      description: 'Java Thread Model, creating threads, priorities, and synchronization.',
      estimatedTime: 55,
      difficulty: 'Intermediate',
      order: 8,
      stages: makeStages(),
      learningContent: `// Method 1: Extend Thread class
class MyThread extends Thread {
    public void run() {
        for (int i = 0; i < 5; i++)
            System.out.println(getName() + ": " + i);
    }
}

// Method 2: Implement Runnable (preferred)
class MyTask implements Runnable {
    public void run() {
        System.out.println("Task running in: " + Thread.currentThread().getName());
    }
}

// Creating and starting threads
Thread t1 = new MyThread();
Thread t2 = new Thread(new MyTask());
t1.setPriority(Thread.MAX_PRIORITY);  // 10 (highest)
t2.setPriority(Thread.MIN_PRIORITY);  // 1 (lowest)
t1.start();  // Don't call run() directly!
t2.start();

// Synchronization -- prevent race conditions
synchronized void deposit(int amount) {
    balance += amount;  // only one thread at a time
}`,
      keyPoints: [
        'A thread is a lightweight sub-process running concurrently',
        'Create threads by extending Thread or implementing Runnable',
        'Call start() not run() -- start() creates a new thread',
        'Thread priorities: MIN(1) to MAX(10); NORM is 5',
        'synchronized keyword prevents race conditions on shared data',
      ],
    },
    {
      id: 'java_io',
      languageId: 'java',
      title: 'I/O Basics & String Handling',
      description: 'Java I/O streams, Scanner, String and StringBuffer operations.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 9,
      stages: makeStages(),
      learningContent: `// I/O Basics
import java.util.Scanner;
Scanner sc = new Scanner(System.in);
int n = sc.nextInt();
String name = sc.next();       // single word
String line = sc.nextLine();   // full line

// String operations (immutable)
String s = "Hello, SASTRA!";
System.out.println(s.length());          // 14
System.out.println(s.toUpperCase());     // HELLO, SASTRA!
System.out.println(s.substring(7, 13)); // SASTRA
System.out.println(s.contains("SASTRA")); // true
System.out.println(s.replace("Hello", "Hi")); // Hi, SASTRA!
String[] parts = s.split(", ");         // ["Hello", "SASTRA!"]

// StringBuffer (mutable -- use for frequent modification)
StringBuffer sb = new StringBuffer("Hello");
sb.append(" World");    // "Hello World"
sb.insert(5, ",");      // "Hello, World"
sb.reverse();           // "dlroW ,olleH"
sb.delete(0, 5);        // " ,olleH"
System.out.println(sb.toString());`,
      keyPoints: [
        'Scanner reads input from console -- sc.nextInt(), sc.nextLine()',
        'String is immutable -- every operation creates a new String object',
        'Common String methods: length(), charAt(), substring(), contains(), split()',
        'StringBuffer is mutable -- use for repeated string modifications',
        'StringBuffer.append() is faster than String + String in loops',
      ],
    },
    // -- UNIT III ----------------------------------------------------------------
    {
      id: 'java_collections',
      languageId: 'java',
      title: 'Collections Framework',
      description: 'ArrayList, LinkedList, HashSet, HashMap, TreeMap and Comparators.',
      estimatedTime: 55,
      difficulty: 'Intermediate',
      order: 10,
      stages: makeStages(),
      learningContent: `import java.util.*;

// List -- ordered, allows duplicates
ArrayList<String> list = new ArrayList<>();
list.add("Alice"); list.add("Bob"); list.add("Alice");
System.out.println(list);        // [Alice, Bob, Alice]

LinkedList<Integer> ll = new LinkedList<>();
ll.addFirst(10); ll.addLast(20); // fast insert at ends

// Set -- no duplicates
HashSet<String> set = new HashSet<>();
set.add("A"); set.add("B"); set.add("A"); // {A, B}

TreeSet<Integer> ts = new TreeSet<>(List.of(5,2,8,1));
System.out.println(ts); // [1, 2, 5, 8] -- sorted!

// Map -- key-value pairs
HashMap<String, Integer> map = new HashMap<>();
map.put("Alice", 95); map.put("Bob", 87);
System.out.println(map.get("Alice")); // 95

TreeMap<String, Integer> tm = new TreeMap<>(map);
System.out.println(tm); // sorted by keys

// Custom sort with Comparator
list.sort(Comparator.reverseOrder());`,
      keyPoints: [
        'List (ArrayList/LinkedList): ordered, allows duplicates',
        'Set (HashSet/TreeSet): no duplicates; TreeSet is always sorted',
        'Map (HashMap/TreeMap): key-value pairs; TreeMap sorts by key',
        'ArrayList: fast random access; LinkedList: fast insert/delete at ends',
        'Comparator allows custom sorting logic for any collection',
      ],
    },
    {
      id: 'java_events',
      languageId: 'java',
      title: 'Event Handling',
      description: 'Delegation event model, event classes, listeners, adapter classes, and inner classes.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 11,
      stages: makeStages(),
      learningContent: `import java.awt.*;
import java.awt.event.*;

// Delegation Event Model: Source -> Event -> Listener
public class ButtonDemo extends Frame implements ActionListener {
    Button btn;
    ButtonDemo() {
        btn = new Button("Click Me");
        btn.addActionListener(this);  // register listener
        add(btn);
        setSize(300, 200); setVisible(true);
    }

    // Handle the event
    public void actionPerformed(ActionEvent e) {
        System.out.println("Button clicked: " + e.getSource());
    }
}

// Adapter class -- only override methods you need
class MyMouseAdapter extends MouseAdapter {
    public void mouseClicked(MouseEvent e) {
        System.out.println("Mouse clicked at: " + e.getX() + "," + e.getY());
    }
}

// Anonymous inner class (concise alternative)
btn.addActionListener(new ActionListener() {
    public void actionPerformed(ActionEvent e) {
        System.out.println("Clicked!");
    }
});`,
      keyPoints: [
        'Delegation model: Event Source generates event -> Listener handles it',
        'Register listener with addActionListener() / addMouseListener()',
        'Implement the Listener interface to handle specific events',
        'Adapter classes (MouseAdapter) provide empty implementations -- override only what you need',
        'Anonymous inner classes are a concise way to write one-time listeners',
      ],
    },
    // -- UNIT IV -----------------------------------------------------------------
    {
      id: 'java_swing',
      languageId: 'java',
      title: 'GUI Programming with Swing',
      description: 'Swing components -- JFrame, JButton, JLabel, JTextField, menus and layouts.',
      estimatedTime: 55,
      difficulty: 'Intermediate',
      order: 12,
      stages: makeStages(),
      learningContent: `import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class SwingDemo extends JFrame {
    SwingDemo() {
        setTitle("SASTRA App");
        setSize(400, 300);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new FlowLayout());

        // Components
        JLabel label = new JLabel("Enter Name:");
        JTextField field = new JTextField(15);
        JButton btn = new JButton("Greet");

        btn.addActionListener(e ->
            JOptionPane.showMessageDialog(this, "Hello, " + field.getText())
        );

        add(label); add(field); add(btn);

        // Menu bar
        JMenuBar menuBar = new JMenuBar();
        JMenu fileMenu = new JMenu("File");
        JMenuItem exitItem = new JMenuItem("Exit");
        exitItem.addActionListener(e -> System.exit(0));
        fileMenu.add(exitItem);
        menuBar.add(fileMenu);
        setJMenuBar(menuBar);

        setVisible(true);
    }
    public static void main(String[] args) {
        new SwingDemo();
    }
}`,
      keyPoints: [
        'Swing is part of javax.swing -- lightweight, platform-independent GUI toolkit',
        'JFrame is the main window; set size, layout, and close operation',
        'Common components: JLabel, JTextField, JButton, JCheckBox, JComboBox',
        'Layouts: FlowLayout (left-to-right), BorderLayout (5 regions), GridLayout (rows x cols)',
        'JMenuBar -> JMenu -> JMenuItem builds the menu hierarchy',
      ],
    },
  ],

  // --- HTML & CSS ---------------------------------------------------------------
  html_css: [
    {
      id: 'html_structure',
      languageId: 'html_css',
      title: 'HTML Structure & Semantics',
      description: 'Build well-structured HTML documents with semantic elements.',
      estimatedTime: 40,
      difficulty: 'Beginner',
      order: 1,
      stages: makeStages(),
      learningContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header><nav>...</nav></header>
    <main>
        <article>
            <h1>Heading</h1>
            <p>Paragraph</p>
        </article>
    </main>
    <footer>...</footer>
</body>
</html>`,
      keyPoints: [
        'DOCTYPE declaration for HTML5',
        'Semantic elements: header, nav, main, article, footer',
        'meta charset for character encoding',
        'viewport meta tag for responsive design',
        'Proper nesting is required',
      ],
    },
    {
      id: 'css_selectors',
      languageId: 'html_css',
      title: 'CSS Selectors & Specificity',
      description: 'Master CSS selectors, specificity, and the cascade.',
      estimatedTime: 45,
      difficulty: 'Beginner',
      order: 2,
      stages: makeStages(),
      learningContent: `/* Element: */ p { color: blue; }
/* Class: */ .btn { padding: 8px; }
/* ID: */ #header { background: black; }
/* Attribute: */ input[type="text"] { border: 1px solid; }
/* Pseudo-class: */ a:hover { color: red; }
/* Pseudo-element: */ p::first-line { font-weight: bold; }
/* Descendant: */ div p { margin: 0; }
/* Child: */ ul > li { list-style: none; }
/* Sibling: */ h1 + p { color: gray; }

Specificity: ID (100) > Class (10) > Element (1)`,
      keyPoints: [
        'Selectors target HTML elements to style',
        'Classes (.) reusable; IDs (#) unique per page',
        'Specificity determines which rule wins',
        'Pseudo-classes (:hover) for states',
        'Pseudo-elements (::before) for content',
      ],
    },
    {
      id: 'css_flexbox',
      languageId: 'html_css',
      title: 'Flexbox Layout',
      description: 'Build flexible layouts with CSS Flexbox.',
      estimatedTime: 45,
      difficulty: 'Beginner',
      order: 3,
      stages: makeStages(),
      learningContent: `.container {
    display: flex;
    flex-direction: row;       /* or column */
    justify-content: center;   /* main axis */
    align-items: center;       /* cross axis */
    flex-wrap: wrap;
    gap: 16px;
}

.item {
    flex: 1;                   /* grow to fill space */
    flex-shrink: 0;            /* don't shrink */
    align-self: flex-start;    /* override align-items */
}`,
      keyPoints: [
        'display: flex creates a flex container',
        'justify-content controls main axis alignment',
        'align-items controls cross axis alignment',
        'flex: 1 makes items share space equally',
        'flex-wrap: wrap prevents overflow',
      ],
    },
    {
      id: 'css_grid',
      languageId: 'html_css',
      title: 'CSS Grid Layout',
      description: 'Create complex two-dimensional layouts with CSS Grid.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 4,
      stages: makeStages(),
      learningContent: `.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    gap: 20px;
}

.item-span {
    grid-column: 1 / 3;       /* span 2 columns */
    grid-row: 1 / 2;
}

/* Named areas */
.layout {
    grid-template-areas:
        "header header"
        "sidebar main"
        "footer footer";
}`,
      keyPoints: [
        'display: grid enables grid layout',
        'grid-template-columns defines column structure',
        'fr unit distributes available space',
        'gap controls space between grid items',
        'grid-column/row-span for spanning multiple cells',
      ],
    },
    {
      id: 'responsive_design',
      languageId: 'html_css',
      title: 'Responsive Design & Media Queries',
      description: 'Make websites work on all screen sizes.',
      estimatedTime: 45,
      difficulty: 'Intermediate',
      order: 5,
      stages: makeStages(),
      learningContent: `/* Mobile first */
.container { width: 100%; padding: 16px; }

@media (min-width: 768px) {
    .container { max-width: 720px; margin: 0 auto; }
}

@media (min-width: 1024px) {
    .container { max-width: 960px; }
    .grid { grid-template-columns: repeat(3, 1fr); }
}

/* Responsive images */
img { max-width: 100%; height: auto; }

/* Viewport units */
.hero { height: 100vh; width: 100vw; }`,
      keyPoints: [
        'Mobile-first: start small, add complexity for larger screens',
        '@media queries apply styles at specific breakpoints',
        'Common breakpoints: 768px (tablet), 1024px (desktop)',
        'max-width: 100% prevents images from overflowing',
        'Viewport units: vw/vh relative to viewport size',
      ],
    },
  ],

  // --- Data Analytics -----------------------------------------------------------
  data_analytics: [
    {
      id: 'numpy_basics',
      languageId: 'data_analytics',
      title: 'NumPy Fundamentals',
      description: 'Master numerical computing with NumPy arrays and operations.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 1,
      stages: makeStages(),
      learningContent: `import numpy as np

# Creating arrays
arr = np.array([1, 2, 3, 4, 5])
zeros = np.zeros((3, 3))
ones = np.ones((2, 4))
range_arr = np.arange(0, 10, 2)

# Operations (element-wise)
arr * 2, arr + 10, arr ** 2
np.sum(arr), np.mean(arr), np.std(arr)

# Indexing and slicing
arr[2], arr[1:4], arr[arr > 2]

# 2D arrays
matrix = np.array([[1,2],[3,4]])
matrix.shape, matrix.T  # transpose`,
      keyPoints: [
        'NumPy arrays are faster than Python lists',
        'Operations apply element-wise by default',
        'Broadcasting enables operations on different shapes',
        'shape attribute gives dimensions',
        'Boolean indexing filters arrays',
      ],
    },
    {
      id: 'pandas_basics',
      languageId: 'data_analytics',
      title: 'Pandas DataFrames',
      description: 'Manipulate and analyze tabular data with pandas.',
      estimatedTime: 55,
      difficulty: 'Intermediate',
      order: 2,
      stages: makeStages(),
      learningContent: `import pandas as pd

# Create DataFrame
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'score': [85.0, 92.0, 78.0]
})

df.head(), df.info(), df.describe()
df['age'], df[['name', 'age']]  # Select
df[df['age'] > 28]              # Filter
df.sort_values('score', ascending=False)
df.groupby('category').mean()
df.isnull().sum()               # Check nulls`,
      keyPoints: [
        'DataFrame is a 2D table with labeled columns',
        'Series is a 1D labeled array',
        "df['col'] selects a column",
        "Boolean indexing: df[df['col'] > value]",
        'groupby() for aggregation analysis',
      ],
    },
    {
      id: 'data_visualization',
      languageId: 'data_analytics',
      title: 'Data Visualization',
      description: 'Create charts and plots with matplotlib and seaborn.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 3,
      stages: makeStages(),
      learningContent: `import matplotlib.pyplot as plt
import seaborn as sns

# Line plot
plt.plot(x, y, label='Line', color='blue')
plt.xlabel('X'), plt.ylabel('Y')
plt.title('My Plot')
plt.legend(), plt.show()

# Bar chart
plt.bar(categories, values, color='yellow')

# Scatter plot
plt.scatter(x, y, c='red', alpha=0.5)

# Seaborn
sns.histplot(df['age'], bins=20)
sns.boxplot(data=df, x='category', y='value')
sns.heatmap(correlation_matrix, annot=True)`,
      keyPoints: [
        'matplotlib is the foundation of Python plotting',
        'plt.show() renders the plot',
        'seaborn has beautiful statistical plots',
        'figsize controls plot dimensions',
        'Correlation heatmaps show relationships',
      ],
    },
    {
      id: 'data_cleaning',
      languageId: 'data_analytics',
      title: 'Data Cleaning',
      description: 'Handle missing values, duplicates, and data inconsistencies.',
      estimatedTime: 50,
      difficulty: 'Intermediate',
      order: 4,
      stages: makeStages(),
      learningContent: `# Missing values
df.isnull().sum()
df.dropna()                    # Drop rows with any NaN
df.fillna(0)                   # Fill with 0
df['col'].fillna(df['col'].mean())  # Fill with mean

# Duplicates
df.duplicated().sum()
df.drop_duplicates()

# Data types
df['col'] = df['col'].astype(int)
pd.to_datetime(df['date'])

# Renaming and dropping
df.rename(columns={'old': 'new'})
df.drop(columns=['unwanted_col'])`,
      keyPoints: [
        'Real-world data is almost always messy',
        'dropna() removes; fillna() imputes missing values',
        'Check for duplicates with duplicated()',
        'Correct data types are essential for analysis',
        "Data cleaning is 80% of a data analyst's work",
      ],
    },
    {
      id: 'statistical_analysis',
      languageId: 'data_analytics',
      title: 'Statistical Analysis',
      description: 'Apply descriptive and inferential statistics to data.',
      estimatedTime: 55,
      difficulty: 'Intermediate',
      order: 5,
      stages: makeStages(),
      learningContent: `import scipy.stats as stats

# Descriptive statistics
df.describe()  # mean, std, min, max, quartiles
df['col'].skew()
df['col'].kurtosis()

# Correlation
df.corr()
df['x'].corr(df['y'])

# Hypothesis testing
t_stat, p_value = stats.ttest_ind(group1, group2)
if p_value < 0.05:
    print("Statistically significant")

# Normality test
stat, p = stats.shapiro(data)`,
      keyPoints: [
        'describe() gives summary statistics',
        'Correlation ranges from -1 to 1',
        'p-value < 0.05 indicates statistical significance',
        'Skewness measures data asymmetry',
        'Hypothesis testing answers "is this difference real?"',
      ],
    },
  ],
}

export function getConceptById(conceptId: string): Concept | undefined {
  for (const concepts of Object.values(CONCEPTS)) {
    const found = concepts.find((c) => c.id === conceptId)
    if (found) return found
  }
  return undefined
}

export function getConceptsByLanguage(languageId: string): Concept[] {
  return CONCEPTS[languageId] || []
}
