import type { CodingChallenge } from '@/types'

export const CODING_CHALLENGES: Record<string, CodingChallenge[]> = {
  operators: [
    {
      id: 'op_basic_1',
      conceptId: 'operators',
      difficulty: 'basic',
      title: 'Arithmetic Calculator',
      description: 'Use Python arithmetic operators to calculate results from two numbers.',
      problemStatement: `Read two integers a and b from input (each on its own line).
Print the following results, each on a new line:
1. a + b
2. a - b
3. a * b
4. a // b  (floor division)
5. a % b   (remainder)`,
      inputFormat: 'Two lines: first line is a (integer), second line is b (integer). b is never 0.',
      outputFormat: 'Five lines: sum, difference, product, floor-division, remainder.',
      constraints: ['1 <= b <= 1000', '0 <= a <= 1000'],
      examples: [
        {
          input: '10\n3',
          output: '13\n7\n30\n3\n1',
          explanation: '10+3=13, 10-3=7, 10*3=30, 10//3=3, 10%3=1',
        },
        {
          input: '7\n2',
          output: '9\n5\n14\n3\n1',
          explanation: '7+2=9, 7-2=5, 7*2=14, 7//2=3, 7%2=1',
        },
      ],
      starterCode: `a = int(input())
b = int(input())

# TODO: print a+b, a-b, a*b, a//b, a%b each on its own line
`,
      visibleTestCases: [
        { input: '10\n3', expectedOutput: '13\n7\n30\n3\n1', explanation: '10 and 3' },
        { input: '7\n2', expectedOutput: '9\n5\n14\n3\n1', explanation: '7 and 2' },
        { input: '15\n4', expectedOutput: '19\n11\n60\n3\n3', explanation: '15 and 4' },
      ],
      hiddenTestCases: [
        { input: '20\n6', expectedOutput: '26\n14\n120\n3\n2' },
        { input: '100\n7', expectedOutput: '107\n93\n700\n14\n2' },
        { input: '9\n9', expectedOutput: '18\n0\n81\n1\n0' },
        { input: '0\n5', expectedOutput: '5\n-5\n0\n0\n0' },
      ],
      hints: [
        'Use print() for each result on its own line',
        '// is floor division (rounds down): 10 // 3 = 3',
        '% is the modulo/remainder operator: 10 % 3 = 1',
        'Read inputs as integers with int(input())',
      ],
    },
    {
      id: 'op_medium_1',
      conceptId: 'operators',
      difficulty: 'medium',
      title: 'Grade Calculator',
      description: 'Use comparison and logical operators to compute a grade.',
      problemStatement: `Read an integer score (0-100) from input.
Print the grade using these rules:
- score >= 90: "A"
- score >= 80: "B"
- score >= 70: "C"
- score >= 60: "D"
- below 60: "F"

Then on the next line print "Pass" if score >= 60, else print "Fail".`,
      inputFormat: 'One integer (0-100).',
      outputFormat: 'Two lines: the grade letter, then Pass or Fail.',
      constraints: ['0 <= score <= 100'],
      examples: [
        { input: '92', output: 'A\nPass', explanation: '92 >= 90 = A, >= 60 = Pass' },
        { input: '55', output: 'F\nFail', explanation: '55 < 60 = F and Fail' },
        { input: '75', output: 'C\nPass', explanation: '75 >= 70 = C, >= 60 = Pass' },
      ],
      starterCode: `score = int(input())

# TODO: determine grade (A/B/C/D/F) using if/elif/else
# TODO: print grade
# TODO: print "Pass" if score >= 60 else "Fail"
`,
      visibleTestCases: [
        { input: '92', expectedOutput: 'A\nPass' },
        { input: '55', expectedOutput: 'F\nFail' },
        { input: '75', expectedOutput: 'C\nPass' },
      ],
      hiddenTestCases: [
        { input: '85', expectedOutput: 'B\nPass' },
        { input: '60', expectedOutput: 'D\nPass' },
        { input: '100', expectedOutput: 'A\nPass' },
        { input: '0', expectedOutput: 'F\nFail' },
        { input: '80', expectedOutput: 'B\nPass' },
      ],
      hints: [
        'Check from highest to lowest: if score >= 90 -> A, elif >= 80 -> B ...',
        'Use the ternary: result = "Pass" if score >= 60 else "Fail"',
        'Each elif is only reached if the previous condition was False',
      ],
    },
    {
      id: 'op_hard_1',
      conceptId: 'operators',
      difficulty: 'hard',
      title: 'Bitwise Operations',
      description: 'Apply bitwise operators and explain the results.',
      problemStatement: `Read two integers a and b from input (each on its own line).
Print the following on separate lines:
1. a & b   (bitwise AND)
2. a | b   (bitwise OR)
3. a ^ b   (bitwise XOR)
4. a << 1  (left shift a by 1)
5. a >> 1  (right shift a by 1)`,
      inputFormat: 'Two lines: a then b (non-negative integers up to 255).',
      outputFormat: 'Five lines: AND, OR, XOR, left-shift, right-shift results.',
      constraints: ['0 <= a, b <= 255'],
      examples: [
        {
          input: '12\n10',
          output: '8\n14\n6\n24\n6',
          explanation: '12=1100, 10=1010. AND=1000=8, OR=1110=14, XOR=0110=6, 12<<1=24, 12>>1=6',
        },
        {
          input: '5\n3',
          output: '1\n7\n6\n10\n2',
          explanation: '5=101, 3=011. AND=001=1, OR=111=7, XOR=110=6, 5<<1=10, 5>>1=2',
        },
      ],
      starterCode: `a = int(input())
b = int(input())

# TODO: print a&b, a|b, a^b, a<<1, a>>1 each on a new line
`,
      visibleTestCases: [
        { input: '12\n10', expectedOutput: '8\n14\n6\n24\n6' },
        { input: '5\n3', expectedOutput: '1\n7\n6\n10\n2' },
        { input: '0\n15', expectedOutput: '0\n15\n15\n0\n0' },
      ],
      hiddenTestCases: [
        { input: '255\n0', expectedOutput: '0\n255\n255\n510\n127' },
        { input: '8\n8', expectedOutput: '8\n8\n0\n16\n4' },
        { input: '7\n7', expectedOutput: '7\n7\n0\n14\n3' },
      ],
      hints: [
        '& is bitwise AND, | is bitwise OR, ^ is XOR',
        'Left shift << by 1 = multiply by 2',
        'Right shift >> by 1 = integer divide by 2',
      ],
    },
  ],
  control_flow: [
    {
      id: 'cf_basic_1',
      conceptId: 'control_flow',
      difficulty: 'basic',
      title: 'Even or Odd',
      description: 'Use the modulo operator and an if/else to check even or odd.',
      problemStatement: `Read an integer n from input.
Print "Even" if n is divisible by 2, otherwise print "Odd".`,
      inputFormat: 'One integer n.',
      outputFormat: 'One word: Even or Odd.',
      constraints: ['-1000 <= n <= 1000'],
      examples: [
        { input: '4', output: 'Even', explanation: '4 % 2 == 0' },
        { input: '7', output: 'Odd', explanation: '7 % 2 != 0' },
        { input: '0', output: 'Even', explanation: '0 % 2 == 0' },
      ],
      starterCode: `n = int(input())

# TODO: print "Even" if n % 2 == 0, else print "Odd"
`,
      visibleTestCases: [
        { input: '4', expectedOutput: 'Even' },
        { input: '7', expectedOutput: 'Odd' },
        { input: '0', expectedOutput: 'Even' },
      ],
      hiddenTestCases: [
        { input: '-3', expectedOutput: 'Odd' },
        { input: '100', expectedOutput: 'Even' },
        { input: '1', expectedOutput: 'Odd' },
        { input: '-8', expectedOutput: 'Even' },
      ],
      hints: [
        'Use the % operator: n % 2 gives the remainder when divided by 2',
        'If remainder is 0, the number is Even',
        'Use if/else to print the correct word',
      ],
    },
    {
      id: 'cf_medium_1',
      conceptId: 'control_flow',
      difficulty: 'medium',
      title: 'FizzBuzz',
      description: 'Classic FizzBuzz using if/elif/else.',
      problemStatement: `Read an integer n from input.
- If n is divisible by both 3 and 5, print "FizzBuzz"
- If n is divisible by 3 only, print "Fizz"
- If n is divisible by 5 only, print "Buzz"
- Otherwise print n itself`,
      inputFormat: 'One integer n.',
      outputFormat: 'One line: FizzBuzz, Fizz, Buzz, or the number.',
      constraints: ['1 <= n <= 1000'],
      examples: [
        { input: '15', output: 'FizzBuzz', explanation: '15 divisible by both 3 and 5' },
        { input: '9', output: 'Fizz', explanation: '9 divisible by 3 only' },
        { input: '10', output: 'Buzz', explanation: '10 divisible by 5 only' },
        { input: '7', output: '7', explanation: 'Not divisible by 3 or 5' },
      ],
      starterCode: `n = int(input())

# TODO: print FizzBuzz, Fizz, Buzz, or n
# Check divisible by BOTH first, then each alone
`,
      visibleTestCases: [
        { input: '15', expectedOutput: 'FizzBuzz' },
        { input: '9', expectedOutput: 'Fizz' },
        { input: '10', expectedOutput: 'Buzz' },
        { input: '7', expectedOutput: '7' },
      ],
      hiddenTestCases: [
        { input: '30', expectedOutput: 'FizzBuzz' },
        { input: '6', expectedOutput: 'Fizz' },
        { input: '20', expectedOutput: 'Buzz' },
        { input: '11', expectedOutput: '11' },
        { input: '1', expectedOutput: '1' },
      ],
      hints: [
        'Check n % 15 == 0 (or n % 3 == 0 and n % 5 == 0) first for FizzBuzz',
        'Use elif for Fizz and Buzz -- order matters!',
        'The else prints n directly: print(n)',
      ],
    },
    {
      id: 'cf_hard_1',
      conceptId: 'control_flow',
      difficulty: 'hard',
      title: 'Simple Calculator with Validation',
      description: 'Build a calculator that validates input and handles edge cases.',
      problemStatement: `Read two numbers and an operator from input (each on its own line):
- Line 1: first number (float)
- Line 2: operator (one of: +, -, *, /)
- Line 3: second number (float)

Compute and print the result rounded to 2 decimal places.
Special cases:
- Division by zero: print "Error: Division by zero"
- Invalid operator: print "Error: Invalid operator"`,
      inputFormat: 'Three lines: float, operator string, float.',
      outputFormat: 'The result (2 decimal places) or an error message.',
      constraints: ['Operator is a single character string', '-10000 <= numbers <= 10000'],
      examples: [
        { input: '10.0\n+\n3.5', output: '13.5', explanation: '10.0 + 3.5 = 13.5' },
        { input: '10.0\n/\n0.0', output: 'Error: Division by zero', explanation: 'Cannot divide by zero' },
        { input: '7.0\n%\n2.0', output: 'Error: Invalid operator', explanation: '% is not a valid operator here' },
      ],
      starterCode: `a = float(input())
op = input()
b = float(input())

# TODO: compute result based on op (+, -, *, /)
# Handle division by zero and invalid operator
`,
      visibleTestCases: [
        { input: '10.0\n+\n3.5', expectedOutput: '13.5' },
        { input: '10.0\n/\n0.0', expectedOutput: 'Error: Division by zero' },
        { input: '7.0\n%\n2.0', expectedOutput: 'Error: Invalid operator' },
      ],
      hiddenTestCases: [
        { input: '9.0\n-\n4.0', expectedOutput: '5.0' },
        { input: '3.0\n*\n3.0', expectedOutput: '9.0' },
        { input: '7.0\n/\n2.0', expectedOutput: '3.5' },
        { input: '0.0\n+\n0.0', expectedOutput: '0.0' },
      ],
      hints: [
        'Use if/elif to check which operator was entered',
        'Check for division by zero before dividing: if b == 0',
        'Use round(result, 2) to round to 2 decimal places',
        'The else branch handles the invalid operator case',
      ],
    },
  ],
  variables: [
    {
      id: 'var_basic_1',
      conceptId: 'variables',
      difficulty: 'basic',
      title: 'Hello, Variable!',
      description: 'Practice reading input into variables and printing them.',
      problemStatement: `Read a name and an age from input.
Store them in variables called \`first_name\` (string) and \`age\` (integer).
Print them in the format: "My name is [first_name] and I am [age] years old."`,
      inputFormat: 'Two lines: first line is the name (string), second line is the age (integer).',
      outputFormat: 'One line: My name is [first_name] and I am [age] years old.',
      constraints: ['Use exactly the variable names first_name and age', 'Use an f-string or string concatenation for output'],
      examples: [
        {
          input: 'Alice\n20',
          output: 'My name is Alice and I am 20 years old.',
          explanation: 'Read name=Alice, age=20 from input and print formatted.',
        },
        {
          input: 'Bob\n25',
          output: 'My name is Bob and I am 25 years old.',
          explanation: 'Read name=Bob, age=25 from input and print formatted.',
        },
      ],
      starterCode: `# Read input
first_name = input()
age = int(input())

# TODO: Print the output in the format:
# My name is [first_name] and I am [age] years old.
`,
      visibleTestCases: [
        { input: 'Alice\n20', expectedOutput: 'My name is Alice and I am 20 years old.', explanation: 'Basic case' },
        { input: 'Bob\n25', expectedOutput: 'My name is Bob and I am 25 years old.', explanation: 'Different name and age' },
        { input: 'Charlie\n18', expectedOutput: 'My name is Charlie and I am 18 years old.', explanation: 'Another name and age' },
      ],
      hiddenTestCases: [
        { input: 'Diana\n22', expectedOutput: 'My name is Diana and I am 22 years old.' },
        { input: 'Ethan\n30', expectedOutput: 'My name is Ethan and I am 30 years old.' },
        { input: 'Fatima\n19', expectedOutput: 'My name is Fatima and I am 19 years old.' },
        { input: 'Gaurav\n21', expectedOutput: 'My name is Gaurav and I am 21 years old.' },
        { input: 'Helen\n27', expectedOutput: 'My name is Helen and I am 27 years old.' },
      ],
      hints: [
        'Use input() to read the name: first_name = input()',
        'Use int(input()) to read the age as an integer: age = int(input())',
        'Use an f-string: f"My name is {first_name} and I am {age} years old."',
      ],
    },
    {
      id: 'var_medium_1',
      conceptId: 'variables',
      difficulty: 'medium',
      title: 'Temperature Converter',
      description: 'Use variables to convert temperature from Celsius to Fahrenheit.',
      problemStatement: `Write a program that:
1. Stores a temperature in Celsius in a variable called \`celsius\`
2. Converts it to Fahrenheit using the formula: F = (C x 9/5) + 32
3. Stores the result in a variable called \`fahrenheit\`
4. Prints: "XdegC = YdegF" where X and Y are the values (rounded to 2 decimal places)`,
      inputFormat: 'A single float number representing temperature in Celsius.',
      outputFormat: 'XdegC = YdegF (Y rounded to 2 decimal places)',
      constraints: ['Use variable names: celsius and fahrenheit', 'Round fahrenheit to 2 decimal places using round()'],
      examples: [
        {
          input: '100',
          output: '100degC = 212.0degF',
          explanation: '(100 x 9/5) + 32 = 212',
        },
        {
          input: '0',
          output: '0degC = 32.0degF',
          explanation: '(0 x 9/5) + 32 = 32',
        },
        {
          input: '37',
          output: '37degC = 98.6degF',
          explanation: 'Normal body temperature',
        },
      ],
      starterCode: `# Read the temperature
celsius = float(input())

# Convert to Fahrenheit
fahrenheit = # Your formula here

# Print the result
print(f"{celsius}degC = {fahrenheit}degF")
`,
      visibleTestCases: [
        { input: '100', expectedOutput: '100.0degC = 212.0degF', explanation: 'Boiling point' },
        { input: '0', expectedOutput: '0.0degC = 32.0degF', explanation: 'Freezing point' },
        { input: '37', expectedOutput: '37.0degC = 98.6degF', explanation: 'Body temperature' },
      ],
      hiddenTestCases: [
        { input: '-40', expectedOutput: '-40.0degC = -40.0degF' },
        { input: '25', expectedOutput: '25.0degC = 77.0degF' },
        { input: '20', expectedOutput: '20.0degC = 68.0degF' },
        { input: '-10', expectedOutput: '-10.0degC = 14.0degF' },
        { input: '100', expectedOutput: '100.0degC = 212.0degF' },
      ],
      hints: [
        'The formula is F = (C * 9/5) + 32',
        'Use round(value, 2) to round to 2 decimal places',
        'float(input()) reads a decimal number from input',
      ],
    },
    {
      id: 'var_hard_1',
      conceptId: 'variables',
      difficulty: 'hard',
      title: 'Variable Swapper & Calculator',
      description: 'Swap variables and perform calculations without extra variables.',
      problemStatement: `You are given three numbers a, b, and c. Your task:

1. Read three integers a, b, c from input (space-separated)
2. Swap a and b WITHOUT using a temporary variable (use Python's tuple unpacking)
3. Calculate:
   - \`sum_abc\` = sum of all three (using the SWAPPED values)
   - \`product_ab\` = product of a and b (after swap)
   - \`avg\` = average of all three (rounded to 2 decimal places)
4. Print each result on a separate line:
   After swap: a=X, b=Y, c=Z
   Sum: X
   Product(a,b): X
   Average: X`,
      inputFormat: 'Three space-separated integers on one line.',
      outputFormat: '4 lines as shown above.',
      constraints: ['Must use Python tuple unpacking for swap (a, b = b, a)', 'Average rounded to 2 decimal places'],
      examples: [
        {
          input: '3 7 5',
          output: 'After swap: a=7, b=3, c=5\nSum: 15\nProduct(a,b): 21\nAverage: 5.0',
          explanation: 'a=3, b=7 swapped -> a=7, b=3. Sum=15, Product=21, Avg=5.0',
        },
      ],
      starterCode: `# Read input
nums = input().split()
a, b, c = int(nums[0]), int(nums[1]), int(nums[2])

# Swap a and b without temporary variable
# Your code here

# Calculate
sum_abc = a + b + c
product_ab = a * b
avg = round(sum_abc / 3, 2)

# Print results
print(f"After swap: a={a}, b={b}, c={c}")
print(f"Sum: {sum_abc}")
print(f"Product(a,b): {product_ab}")
print(f"Average: {avg}")
`,
      visibleTestCases: [
        { input: '3 7 5', expectedOutput: 'After swap: a=7, b=3, c=5\nSum: 15\nProduct(a,b): 21\nAverage: 5.0', explanation: 'Basic swap and calculations' },
        { input: '1 2 3', expectedOutput: 'After swap: a=2, b=1, c=3\nSum: 6\nProduct(a,b): 2\nAverage: 2.0', explanation: 'Small values swap' },
        { input: '10 20 30', expectedOutput: 'After swap: a=20, b=10, c=30\nSum: 60\nProduct(a,b): 200\nAverage: 20.0', explanation: 'Larger values' },
      ],
      hiddenTestCases: [
        { input: '5 5 5', expectedOutput: 'After swap: a=5, b=5, c=5\nSum: 15\nProduct(a,b): 25\nAverage: 5.0' },
        { input: '0 1 2', expectedOutput: 'After swap: a=1, b=0, c=2\nSum: 3\nProduct(a,b): 0\nAverage: 1.0' },
        { input: '100 200 300', expectedOutput: 'After swap: a=200, b=100, c=300\nSum: 600\nProduct(a,b): 20000\nAverage: 200.0' },
        { input: '7 3 9', expectedOutput: 'After swap: a=3, b=7, c=9\nSum: 19\nProduct(a,b): 21\nAverage: 6.33' },
        { input: '50 25 75', expectedOutput: 'After swap: a=25, b=50, c=75\nSum: 150\nProduct(a,b): 1250\nAverage: 50.0' },
      ],
      hints: [
        'To swap: a, b = b, a (no temp variable needed!)',
        'Read 3 values: a, b, c = int(nums[0]), int(nums[1]), int(nums[2])',
        'round(value, 2) rounds to 2 decimal places',
        'Swap first, THEN calculate to use the swapped values',
      ],
    },
  ],
  loops: [
    {
      id: 'loops_basic_1',
      conceptId: 'loops',
      difficulty: 'basic',
      title: 'Sum of Numbers',
      description: 'Use a loop to calculate the sum of numbers from 1 to N.',
      problemStatement: `Read a positive integer N from input.
Use a for loop to calculate the sum of all integers from 1 to N (inclusive).
Print the result.`,
      inputFormat: 'A single positive integer N.',
      outputFormat: 'A single integer: the sum.',
      constraints: ['1 <= N <= 1000', 'Must use a for loop'],
      examples: [
        { input: '5', output: '15', explanation: '1+2+3+4+5 = 15' },
        { input: '10', output: '55', explanation: '1+2+...+10 = 55' },
      ],
      starterCode: `n = int(input())
total = 0

# TODO: Use a for loop to sum numbers from 1 to n
# for i in range(...):
#     total += ...

print(total)
`,
      visibleTestCases: [
        { input: '5', expectedOutput: '15', explanation: '1+2+3+4+5=15' },
        { input: '10', expectedOutput: '55', explanation: '1+2+...+10=55' },
        { input: '1', expectedOutput: '1', explanation: 'Single number' },
      ],
      hiddenTestCases: [
        { input: '100', expectedOutput: '5050' },
        { input: '50', expectedOutput: '1275' },
        { input: '3', expectedOutput: '6' },
        { input: '7', expectedOutput: '28' },
        { input: '20', expectedOutput: '210' },
      ],
      hints: [
        'Initialize a total = 0 before the loop',
        'range(1, n+1) generates numbers from 1 to n inclusive',
        'Use += to accumulate the sum',
      ],
    },
    {
      id: 'loops_medium_1',
      conceptId: 'loops',
      difficulty: 'medium',
      title: 'FizzBuzz',
      description: 'The classic FizzBuzz problem using loops and conditions.',
      problemStatement: `Print numbers from 1 to N with these rules:
- If divisible by 3: print "Fizz"
- If divisible by 5: print "Buzz"
- If divisible by both 3 and 5: print "FizzBuzz"
- Otherwise: print the number`,
      inputFormat: 'A single integer N.',
      outputFormat: 'N lines, one per number.',
      constraints: ['1 <= N <= 100'],
      examples: [
        {
          input: '15',
          output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
          explanation: 'Classic FizzBuzz for 1-15',
        },
      ],
      starterCode: `n = int(input())

for i in range(1, n + 1):
    if i % 15 == 0:      # Check FizzBuzz first!
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`,
      visibleTestCases: [
        { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz' },
        { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' },
      ],
      hiddenTestCases: [
        { input: '1', expectedOutput: '1' },
        { input: '3', expectedOutput: '1\n2\nFizz' },
        { input: '20', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz' },
      ],
      hints: [
        'Check for FizzBuzz (divisible by both 3 AND 5) FIRST',
        '15 is divisible by both 3 and 5, or check: i % 3 == 0 and i % 5 == 0',
        'Order matters: FizzBuzz -> Fizz -> Buzz -> else',
      ],
    },
    {
      id: 'loops_hard_1',
      conceptId: 'loops',
      difficulty: 'hard',
      title: 'Pattern Printer',
      description: 'Use nested loops to print a number triangle pattern.',
      problemStatement: `Given N, print a right-aligned triangle of numbers.

For N=4, output:
\`\`\`
   1
  12
 123
1234
\`\`\`

Each row i (1-indexed) contains numbers 1 to i.
Each row is right-padded with spaces to be N characters wide total.`,
      inputFormat: 'A single integer N (1-10).',
      outputFormat: 'N lines forming a right-aligned triangle.',
      constraints: ['1 <= N <= 10'],
      examples: [
        { input: '4', output: '   1\n  12\n 123\n1234', explanation: 'Right-aligned triangle for N=4' },
        { input: '3', output: '  1\n 12\n123', explanation: 'Right-aligned triangle for N=3' },
      ],
      starterCode: `n = int(input())

for i in range(1, n + 1):
    # Build the number string for this row
    row = ""
    for j in range(1, i + 1):
        row += str(j)

    # Right-align: pad with spaces on the left
    print(row.rjust(n))
`,
      visibleTestCases: [
        { input: '4', expectedOutput: '   1\n  12\n 123\n1234' },
        { input: '3', expectedOutput: '  1\n 12\n123' },
      ],
      hiddenTestCases: [
        { input: '1', expectedOutput: '1' },
        { input: '2', expectedOutput: ' 1\n12' },
        { input: '5', expectedOutput: '    1\n   12\n  123\n 1234\n12345' },
      ],
      hints: [
        'Use nested loops: outer for rows, inner for numbers in each row',
        'str.rjust(n) right-justifies a string in n characters',
        'Build the number string first, then pad it',
        'For row i, numbers go from 1 to i',
      ],
    },
  ],
  functions: [
    {
      id: 'func_basic_1',
      conceptId: 'functions',
      difficulty: 'basic',
      title: 'Greeting Function',
      description: 'Write a function that creates a personalized greeting.',
      problemStatement: `Define a function called \`greet\` that:
- Takes two parameters: \`name\` (string) and \`time_of_day\` (string)
- Returns the string: "Good [time_of_day], [name]!"

Read name and time from input (one per line) and print the greeting.`,
      inputFormat: 'Two lines: name, then time_of_day.',
      outputFormat: 'One greeting line.',
      constraints: ['Function must be named greet', 'Must use return (not print inside function)'],
      examples: [
        { input: 'Alice\nmorning', output: 'Good morning, Alice!', explanation: 'Basic greeting' },
        { input: 'Bob\nevening', output: 'Good evening, Bob!', explanation: 'Evening greeting' },
      ],
      starterCode: `def greet(name, time_of_day):
    # TODO: return the greeting string in the format:
    # "Good [time_of_day], [name]!"
    pass

name = input()
time_of_day = input()
print(greet(name, time_of_day))
`,
      visibleTestCases: [
        { input: 'Alice\nmorning', expectedOutput: 'Good morning, Alice!' },
        { input: 'Bob\nevening', expectedOutput: 'Good evening, Bob!' },
      ],
      hiddenTestCases: [
        { input: 'Charlie\nafternoon', expectedOutput: 'Good afternoon, Charlie!' },
        { input: 'Diana\nnight', expectedOutput: 'Good night, Diana!' },
      ],
      hints: ['Use an f-string in the return statement', 'f"Good {time_of_day}, {name}!"'],
    },
    {
      id: 'func_medium_1',
      conceptId: 'functions',
      difficulty: 'medium',
      title: 'Calculator Functions',
      description: 'Build a mini calculator with functions for each operation.',
      problemStatement: `Write four functions: add(a, b), subtract(a, b), multiply(a, b), divide(a, b).

Read an expression in the format: num1 op num2 where op is +, -, *, /
Call the appropriate function and print the result.

For division, round to 2 decimal places.
If dividing by zero, print "Error: Division by zero"`,
      inputFormat: 'One line: num1 op num2 (e.g., "10 + 5")',
      outputFormat: 'The result as a number (or error message)',
      constraints: ['Four separate functions required', 'Division result rounded to 2 decimal places'],
      examples: [
        { input: '10 + 5', output: '15', explanation: 'add(10, 5) = 15' },
        { input: '10 / 3', output: '3.33', explanation: 'divide(10, 3) = 3.33' },
        { input: '5 / 0', output: 'Error: Division by zero', explanation: 'Handle zero division' },
      ],
      starterCode: `def add(a, b): return a + b
def subtract(a, b): return a - b
def multiply(a, b): return a * b
def divide(a, b):
    if b == 0:
        return "Error: Division by zero"
    return round(a / b, 2)

parts = input().split()
a, op, b = float(parts[0]), parts[1], float(parts[2])

if op == '+': print(add(a, b))
elif op == '-': print(subtract(a, b))
elif op == '*': print(multiply(a, b))
elif op == '/': print(divide(a, b))
`,
      visibleTestCases: [
        { input: '10 + 5', expectedOutput: '15.0' },
        { input: '10 / 3', expectedOutput: '3.33' },
        { input: '5 / 0', expectedOutput: 'Error: Division by zero' },
      ],
      hiddenTestCases: [
        { input: '7 * 8', expectedOutput: '56.0' },
        { input: '20 - 7', expectedOutput: '13.0' },
        { input: '100 / 4', expectedOutput: '25.0' },
      ],
      hints: [
        'Define each function with def keyword',
        'Check for zero in divide function before dividing',
        'round(value, 2) rounds to 2 decimal places',
      ],
    },
    {
      id: 'func_hard_1',
      conceptId: 'functions',
      difficulty: 'hard',
      title: 'Recursive Fibonacci',
      description: 'Implement Fibonacci using recursion and memoization.',
      problemStatement: `Write a function fibonacci(n) that returns the nth Fibonacci number.
Use memoization (a dictionary cache) to avoid recalculating.

Fibonacci: F(0)=0, F(1)=1, F(n) = F(n-1) + F(n-2)

Read N, print F(N).`,
      inputFormat: 'A single non-negative integer N (0-35).',
      outputFormat: 'The Nth Fibonacci number.',
      constraints: ['0 <= N <= 35', 'Must use recursion', 'Use a cache dict for memoization'],
      examples: [
        { input: '10', output: '55', explanation: 'F(10) = 55' },
        { input: '0', output: '0', explanation: 'F(0) = 0' },
        { input: '1', output: '1', explanation: 'F(1) = 1' },
      ],
      starterCode: `cache = {}

def fibonacci(n):
    # TODO: Check if n is already in cache and return it if so
    # TODO: Handle base cases (n <= 1)
    # TODO: Recursively compute fibonacci(n-1) + fibonacci(n-2)
    # TODO: Store the result in cache before returning
    pass

n = int(input())
print(fibonacci(n))
`,
      visibleTestCases: [
        { input: '10', expectedOutput: '55' },
        { input: '0', expectedOutput: '0' },
        { input: '1', expectedOutput: '1' },
      ],
      hiddenTestCases: [
        { input: '20', expectedOutput: '6765' },
        { input: '35', expectedOutput: '9227465' },
        { input: '7', expectedOutput: '13' },
      ],
      hints: [
        'Base case: if n <= 1, return n',
        'Recursive case: fibonacci(n-1) + fibonacci(n-2)',
        'Cache results: before returning, store in cache dict',
        'Check cache at the start of function',
      ],
    },
  ],
  modules: [
    {
      id: 'mod_basic_1',
      conceptId: 'modules',
      difficulty: 'basic',
      title: 'Math Module Basics',
      description: 'Use the math module to compute square root and floor.',
      problemStatement: `Read an integer n from input.
Print two lines:
1. The square root of n rounded to 2 decimal places
2. The floor of the square root as an integer`,
      inputFormat: 'One integer n (1 <= n <= 10^6).',
      outputFormat: 'Two lines: sqrt rounded to 2 dp, then floor of sqrt.',
      constraints: ['1 <= n <= 1000000'],
      examples: [
        { input: '16', output: '4.00\n4', explanation: 'sqrt(16)=4.0, floor=4' },
        { input: '20', output: '4.47\n4', explanation: 'sqrt(20)=4.472..., floor=4' },
        { input: '9', output: '3.00\n3', explanation: 'sqrt(9)=3.0, floor=3' },
      ],
      starterCode: `import math

n = int(input())

# TODO: print round(math.sqrt(n), 2)
# TODO: print math.floor(math.sqrt(n))
`,
      visibleTestCases: [
        { input: '16', expectedOutput: '4.00\n4' },
        { input: '20', expectedOutput: '4.47\n4' },
        { input: '9', expectedOutput: '3.00\n3' },
      ],
      hiddenTestCases: [
        { input: '2', expectedOutput: '1.41\n1' },
        { input: '100', expectedOutput: '10.00\n10' },
        { input: '50', expectedOutput: '7.07\n7' },
        { input: '1000000', expectedOutput: '1000.00\n1000' },
      ],
      hints: [
        'import math at the top',
        'math.sqrt(n) gives the square root as a float',
        'round(value, 2) rounds to 2 decimal places',
        'math.floor(x) returns the largest integer <= x',
      ],
    },
    {
      id: 'mod_medium_1',
      conceptId: 'modules',
      difficulty: 'medium',
      title: 'Random Number Statistics',
      description: 'Use random and statistics modules to analyse a list of numbers.',
      problemStatement: `Read n integers from input (one per line).
Print three lines:
1. The mean rounded to 2 decimal places
2. The median rounded to 2 decimal places
3. The minimum and maximum separated by a space`,
      inputFormat: 'First line: n (count). Next n lines: one integer each.',
      outputFormat: 'Three lines: mean, median, then "min max".',
      constraints: ['1 <= n <= 100', '-1000 <= each number <= 1000'],
      examples: [
        {
          input: '5\n1\n2\n3\n4\n5',
          output: '3.00\n3.00\n1 5',
          explanation: 'mean=3, median=3, min=1, max=5',
        },
        {
          input: '4\n10\n20\n30\n40',
          output: '25.00\n25.00\n10 40',
          explanation: 'mean=25, median=(20+30)/2=25, min=10, max=40',
        },
      ],
      starterCode: `import statistics

n = int(input())
numbers = [int(input()) for _ in range(n)]

# TODO: print round(statistics.mean(numbers), 2)
# TODO: print round(statistics.median(numbers), 2)
# TODO: print min(numbers), max(numbers)
`,
      visibleTestCases: [
        { input: '5\n1\n2\n3\n4\n5', expectedOutput: '3.00\n3.00\n1 5' },
        { input: '4\n10\n20\n30\n40', expectedOutput: '25.00\n25.00\n10 40' },
        { input: '1\n7', expectedOutput: '7.00\n7.00\n7 7' },
      ],
      hiddenTestCases: [
        { input: '3\n-1\n0\n1', expectedOutput: '0.00\n0.00\n-1 1' },
        { input: '6\n5\n3\n8\n1\n9\n2', expectedOutput: '4.67\n4.00\n1 9' },
        { input: '2\n100\n200', expectedOutput: '150.00\n150.00\n100 200' },
      ],
      hints: [
        'import statistics module',
        'statistics.mean(list) and statistics.median(list) work on any list',
        'Use round(value, 2) to format output',
        'Built-in min() and max() work on lists',
      ],
    },
    {
      id: 'mod_hard_1',
      conceptId: 'modules',
      difficulty: 'hard',
      title: 'Date Calculator',
      description: 'Use the datetime module to compute date differences and formatting.',
      problemStatement: `Read two dates from input (one per line) in the format YYYY-MM-DD.
Print three lines:
1. The number of days between the two dates (absolute value)
2. The earlier date formatted as "DD Month YYYY" (e.g. "01 January 2020")
3. The later date formatted as "DD Month YYYY"`,
      inputFormat: 'Two lines, each a date string in YYYY-MM-DD format.',
      outputFormat: 'Three lines: day difference, earlier date formatted, later date formatted.',
      constraints: ['Dates are between 2000-01-01 and 2099-12-31', 'Dates may be given in any order'],
      examples: [
        {
          input: '2024-01-15\n2024-03-20',
          output: '65\n15 January 2024\n20 March 2024',
          explanation: '65 days apart; Jan 15 is earlier',
        },
        {
          input: '2023-12-31\n2024-01-01',
          output: '1\n31 December 2023\n01 January 2024',
          explanation: '1 day apart',
        },
      ],
      starterCode: `from datetime import datetime

line1 = input().strip()
line2 = input().strip()

# TODO: parse both dates using datetime.strptime(s, "%Y-%m-%d")
# TODO: compute absolute difference in days
# TODO: determine earlier and later date
# TODO: format with strftime("%-d %B %Y") -- use "%d" on Windows
`,
      visibleTestCases: [
        { input: '2024-01-15\n2024-03-20', expectedOutput: '65\n15 January 2024\n20 March 2024' },
        { input: '2023-12-31\n2024-01-01', expectedOutput: '1\n31 December 2023\n01 January 2024' },
        { input: '2020-02-28\n2020-03-01', expectedOutput: '2\n28 February 2020\n01 March 2020' },
      ],
      hiddenTestCases: [
        { input: '2024-06-01\n2024-01-01', expectedOutput: '152\n01 January 2024\n01 June 2024' },
        { input: '2021-07-04\n2021-07-04', expectedOutput: '0\n04 July 2021\n04 July 2021' },
        { input: '2000-01-01\n2000-12-31', expectedOutput: '365\n01 January 2000\n31 December 2000' },
      ],
      hints: [
        'datetime.strptime("2024-01-15", "%Y-%m-%d") parses the string into a datetime object',
        'Subtract two datetime objects to get a timedelta; use .days for the integer count',
        'abs() gives the absolute value of days',
        'strftime("%d %B %Y") formats a datetime as "15 January 2024"',
      ],
    },
  ],

  error_handling: [
    {
      id: 'eh_basic_1',
      conceptId: 'error_handling',
      difficulty: 'basic',
      title: 'Safe Division',
      description: 'Use try/except to handle ZeroDivisionError.',
      problemStatement: `Read two integers a and b from input (one per line).
Try to divide a by b.
- If b is 0, print: Error: Division by zero
- Otherwise print the result as a float rounded to 2 decimal places.`,
      inputFormat: 'Two lines: a then b (integers).',
      outputFormat: 'One line: the result or the error message.',
      constraints: ['-1000 <= a, b <= 1000'],
      examples: [
        { input: '10\n4', output: '2.50', explanation: '10/4 = 2.5' },
        { input: '5\n0', output: 'Error: Division by zero', explanation: 'b is 0' },
        { input: '9\n3', output: '3.00', explanation: '9/3 = 3.0' },
      ],
      starterCode: `a = int(input())
b = int(input())

# TODO: use try/except ZeroDivisionError
# If b == 0 print "Error: Division by zero"
# Otherwise print round(a / b, 2)
`,
      visibleTestCases: [
        { input: '10\n4', expectedOutput: '2.50' },
        { input: '5\n0', expectedOutput: 'Error: Division by zero' },
        { input: '9\n3', expectedOutput: '3.00' },
      ],
      hiddenTestCases: [
        { input: '7\n2', expectedOutput: '3.50' },
        { input: '0\n5', expectedOutput: '0.00' },
        { input: '-8\n4', expectedOutput: '-2.00' },
        { input: '1\n0', expectedOutput: 'Error: Division by zero' },
      ],
      hints: [
        'Wrap the division in a try block',
        'Catch ZeroDivisionError specifically: except ZeroDivisionError:',
        'print(round(a / b, 2)) gives 2 decimal places',
      ],
    },
    {
      id: 'eh_medium_1',
      conceptId: 'error_handling',
      difficulty: 'medium',
      title: 'Safe Integer Conversion',
      description: 'Handle ValueError when converting strings to integers.',
      problemStatement: `Read n lines from input. The first line is the count n.
Each of the next n lines is a string that may or may not be a valid integer.
For each line:
- If it converts to an integer successfully, print the integer doubled
- If it raises a ValueError, print: Invalid: <original_string>`,
      inputFormat: 'First line: n. Next n lines: one string each.',
      outputFormat: 'n lines of output.',
      constraints: ['1 <= n <= 20', 'Each string has at most 20 characters'],
      examples: [
        {
          input: '4\n5\nhello\n-3\n2.5',
          output: '10\nInvalid: hello\n-6\nInvalid: 2.5',
          explanation: '5->10, "hello" is invalid, -3->-6, "2.5" is not int',
        },
      ],
      starterCode: `n = int(input())
for _ in range(n):
    s = input()
    # TODO: try int(s), print doubled
    # except ValueError: print "Invalid: <s>"
`,
      visibleTestCases: [
        { input: '4\n5\nhello\n-3\n2.5', expectedOutput: '10\nInvalid: hello\n-6\nInvalid: 2.5' },
        { input: '2\n10\n0', expectedOutput: '20\n0' },
      ],
      hiddenTestCases: [
        { input: '3\nabc\n7\n-1', expectedOutput: 'Invalid: abc\n14\n-2' },
        { input: '1\n999', expectedOutput: '1998' },
        { input: '3\n \n100\nfoo', expectedOutput: 'Invalid: \n200\nInvalid: foo' },
      ],
      hints: [
        'Use try: result = int(s) inside the loop',
        'except ValueError: print(f"Invalid: {s}")',
        'int("2.5") raises ValueError -- only true integers parse',
      ],
    },
    {
      id: 'eh_hard_1',
      conceptId: 'error_handling',
      difficulty: 'hard',
      title: 'Multi-Exception Calculator',
      description: 'Handle multiple exception types with try/except/else/finally.',
      problemStatement: `Read three values from input, one per line: x, y, z (all integers).
Compute: result = (x / y) + z
Print: Result: <result as float with 1 decimal place>

Handle these cases:
- If y is 0: print "Error: Division by zero"
- If any value is not a valid integer: print "Error: Invalid input"

Always print "Done" on the last line (use finally).`,
      inputFormat: 'Three lines: x, y, z (integers).',
      outputFormat: 'Two lines: the result or error, then "Done".',
      constraints: ['-1000 <= x, y, z <= 1000'],
      examples: [
        { input: '8\n2\n3', output: 'Result: 7.0\nDone', explanation: '8/2+3=4+3=7.0' },
        { input: '5\n0\n7', output: 'Error: Division by zero\nDone', explanation: 'y=0' },
        { input: 'abc\n2\n3', output: 'Error: Invalid input\nDone', explanation: 'x is not int' },
      ],
      starterCode: `# TODO: Read x, y, z inside try block (may raise ValueError)
# TODO: Compute (x / y) + z, may raise ZeroDivisionError
# TODO: Print result with 1 decimal: f"Result: {result:.1f}"
# TODO: Use finally to always print "Done"
`,
      visibleTestCases: [
        { input: '8\n2\n3', expectedOutput: 'Result: 7.0\nDone' },
        { input: '5\n0\n7', expectedOutput: 'Error: Division by zero\nDone' },
        { input: 'abc\n2\n3', expectedOutput: 'Error: Invalid input\nDone' },
      ],
      hiddenTestCases: [
        { input: '10\n5\n0', expectedOutput: 'Result: 2.0\nDone' },
        { input: '9\n3\n1', expectedOutput: 'Result: 4.0\nDone' },
        { input: '0\n4\n0', expectedOutput: 'Result: 0.0\nDone' },
        { input: '6\n2\n-1', expectedOutput: 'Result: 2.0\nDone' },
      ],
      hints: [
        'Put all three input() calls inside the try block -- ValueError fires if any fails',
        'Catch ValueError first, then ZeroDivisionError',
        'finally: always runs -- put print("Done") there',
        '8/2 + 3 = 4.0 + 3 = 7.0 -- use f"Result: {result:.1f}"',
      ],
    },
  ],

  file_handling: [
    {
      id: 'fh_basic_1',
      conceptId: 'file_handling',
      difficulty: 'basic',
      title: 'Line Counter',
      description: 'Simulate reading a file and counting its lines.',
      problemStatement: `You are given file contents via stdin. The first line is a single integer N, the number of lines in the file. The next N lines are the file contents.

Print the total number of lines in the file.`,
      inputFormat: 'First line: integer N. Next N lines: file content.',
      outputFormat: 'One line: the integer N.',
      constraints: ['1 <= N <= 100'],
      examples: [
        { input: '3\nhello\nworld\npython', output: '3', explanation: '3 lines given' },
        { input: '1\nonly one line', output: '1', explanation: '1 line given' },
      ],
      starterCode: `n = int(input())
lines = []
for _ in range(n):
    lines.append(input())

# Count and print number of lines
`,
      visibleTestCases: [
        { input: '3\nhello\nworld\npython', expectedOutput: '3' },
        { input: '1\nonly one line', expectedOutput: '1' },
      ],
      hiddenTestCases: [
        { input: '5\na\nb\nc\nd\ne', expectedOutput: '5' },
        { input: '2\nfirst\nsecond', expectedOutput: '2' },
      ],
      hints: [
        'Read N first, then read exactly N lines into a list',
        'len(lines) gives the count',
      ],
    },
    {
      id: 'fh_medium_1',
      conceptId: 'file_handling',
      difficulty: 'medium',
      title: 'Word Frequency Counter',
      description: 'Simulate reading a file and counting word occurrences.',
      problemStatement: `You are given file contents via stdin. The first line is an integer N, the number of lines. The next N lines are the file content (each line has space-separated words).

Count how many times each unique word appears (case-insensitive). Print each word and its count, sorted alphabetically, in the format: word: count`,
      inputFormat: 'First line: integer N. Next N lines: file content with space-separated words.',
      outputFormat: 'One line per unique word: "word: count", sorted alphabetically.',
      constraints: ['1 <= N <= 50', 'Words contain only letters and spaces'],
      examples: [
        { input: '2\nhello world hello\npython hello world', output: 'hello: 3\npython: 1\nworld: 2', explanation: 'hello appears 3 times' },
        { input: '1\nThe the THE', output: 'the: 3', explanation: 'case-insensitive: all map to "the"' },
      ],
      starterCode: `n = int(input())
word_count = {}
for _ in range(n):
    line = input().lower()
    for word in line.split():
        # Count each word
        pass

for word in sorted(word_count):
    print(f"{word}: {word_count[word]}")`,
      visibleTestCases: [
        { input: '2\nhello world hello\npython hello world', expectedOutput: 'hello: 3\npython: 1\nworld: 2' },
        { input: '1\nThe the THE', expectedOutput: 'the: 3' },
      ],
      hiddenTestCases: [
        { input: '1\napple banana apple', expectedOutput: 'apple: 2\nbanana: 1' },
        { input: '2\ncat dog\ndog cat cat', expectedOutput: 'cat: 3\ndog: 2' },
      ],
      hints: [
        'Use .lower() to make comparison case-insensitive',
        'Use a dict: word_count[word] = word_count.get(word, 0) + 1',
        'sorted(word_count) returns keys in alphabetical order',
      ],
    },
    {
      id: 'fh_hard_1',
      conceptId: 'file_handling',
      difficulty: 'hard',
      title: 'CSV Data Processor',
      description: 'Parse and process CSV-formatted data from stdin.',
      problemStatement: `You are given student data via stdin. The first line is an integer N (number of students). Each of the next N lines has the format: Name,Score

For each student assign a grade:
- Score >= 90: A
- Score >= 75: B
- Score >= 60: C
- Otherwise: F

Print each student's Name and Grade separated by comma, sorted by Name alphabetically.
Then print the class average score rounded to 2 decimal places: "Average: X.XX"`,
      inputFormat: 'First line: integer N. Next N lines: Name,Score.',
      outputFormat: 'One line per student: "Name,Grade" sorted by name. Then "Average: X.XX".',
      constraints: ['2 <= N <= 20', 'Score is integer 0-100'],
      examples: [
        {
          input: '4\nAlice,92\nBob,75\nCarla,58\nDev,85',
          output: 'Alice,A\nBob,B\nCarla,F\nDev,B\nAverage: 77.50',
          explanation: 'Sorted by name, then average of 92+75+58+85=310/4=77.5'
        },
      ],
      starterCode: `n = int(input())
students = []
for _ in range(n):
    line = input().split(',')
    name = line[0]
    score = int(line[1])
    students.append((name, score))

results = []
total = 0
for name, score in students:
    total += score
    # Assign grade based on score
    grade = 'F'
    results.append((name, grade))

for name, grade in sorted(results):
    print(f"{name},{grade}")

avg = total / len(students)
print(f"Average: {avg:.2f}")`,
      visibleTestCases: [
        { input: '4\nAlice,92\nBob,75\nCarla,58\nDev,85', expectedOutput: 'Alice,A\nBob,B\nCarla,F\nDev,B\nAverage: 77.50' },
      ],
      hiddenTestCases: [
        { input: '2\nZara,95\nAmir,60', expectedOutput: 'Amir,C\nZara,A\nAverage: 77.50' },
        { input: '3\nRaj,45\nPriya,80\nKiran,70', expectedOutput: 'Kiran,C\nPriya,B\nRaj,F\nAverage: 65.00' },
      ],
      hints: [
        'Split each line by comma: name, score = line.split(",")',
        'Use if/elif/else to assign grades',
        'sorted(results) sorts tuples by first element (name) alphabetically',
        'f"{avg:.2f}" formats to 2 decimal places',
      ],
    },
  ],
}

export function getChallengesForConcept(conceptId: string): CodingChallenge[] {
  return CODING_CHALLENGES[conceptId] || []
}

export function getChallengeByDifficulty(
  conceptId: string,
  difficulty: 'basic' | 'medium' | 'hard'
): CodingChallenge | undefined {
  return CODING_CHALLENGES[conceptId]?.find((c) => c.difficulty === difficulty)
}
