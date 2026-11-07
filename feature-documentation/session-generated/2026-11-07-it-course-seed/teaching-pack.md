# IT teaching draft pack

Original AI-authored course content for instructor review. Seeded into the existing instructor workspace on 6 November 2026; verified and documented on 7 November. This is not institutional approval, student activity, an application-provider inference run or an accuracy certificate.

IT 102 has 16 teaching weeks plus examinations at weeks 9 and 18. IT 202 retains its existing approved outline and existing week-1 items; this pack supplies the 15 missing teaching weeks. All 93 new items remain Draft.

## Programming 1 proposed outline

| Week | Topics | Intended learning outcome |
| --- | --- | --- |
| 1 | Problem solving and algorithms; Problem specification; Input-process-output; Pseudocode and trace tables | Specify inputs and outputs, write a finite algorithm, and trace it using normal and boundary cases. |
| 2 | C programs and the build cycle; Source code and compilation; main and standard output; Syntax and diagnostics | Compile and run a small C program, explain its entry point, and use diagnostics to repair syntax errors. |
| 3 | Variables, types and initialization; Integer and floating-point values; Declarations and initialization; Units and meaningful names | Choose suitable basic C types and initialize variables before reading them. |
| 4 | Expressions and numeric calculations; Arithmetic operators; Integer division and remainder; Precedence and conversion | Evaluate C expressions accurately and distinguish integer division from floating-point division. |
| 5 | Input, output and validation; fgets and bounded input; Parsing numeric input; Input validation | Read a bounded line, check conversion success, and reject values outside the stated domain. |
| 6 | Selection with if and logical conditions; if and else; Relational operators; Logical operators and boundaries | Implement mutually exclusive decisions and test both sides of each decision boundary. |
| 7 | Multiway selection with switch; switch and case; break and fallthrough; default handling | Implement a small integer menu and explain deliberate versus accidental fallthrough. |
| 8 | Repetition with while and do-while; Loop initialization; while and do-while; Termination and accumulators | Trace a loop, maintain an accumulator, and justify termination for a bounded task. |
| 9 | Midterm Examination | Examination milestone |
| 10 | for loops and nested iteration; for loop components; Nested loops; Row and column tracing | Write and trace counted loops and a small two-dimensional iteration. |
| 11 | Functions and decomposition; Function contracts; Parameters and return values; Pass by value and scope | Decompose a calculation into functions with explicit parameters, return values and test cases. |
| 12 | Arrays and bounded traversal; Array declarations; Zero-based indexing; Length-aware traversal | Store and process a fixed-size array without accessing outside its valid indices. |
| 13 | Strings and text boundaries; Null-terminated strings; Character arrays and capacity; strlen and strcmp | Distinguish string length from buffer capacity and compare bounded C strings correctly. |
| 14 | Records with structures; Structure definitions; Members and the dot operator; Arrays of records | Represent a small record using a C structure and access its initialized members. |
| 15 | Text files and checked I/O; FILE streams; Reading and writing text; I/O errors and resource cleanup | Write and read a small text record while checking stream operations and closing resources. |
| 16 | Testing, debugging and evidence; Expected versus actual results; Boundary tests; Warnings and regression tests | Design a small test suite, diagnose a defect, and preserve a regression test for the repair. |
| 17 | Integrated structured-programming project; Decomposition and records; Validation and summaries; Test evidence and documentation | Integrate functions, bounded collections and validation into a documented small program. |
| 18 | Final Examination | Examination milestone |

## IT 102

### Week 1: Problem solving and algorithms

#### Learning material

**Concepts**

A program solves a precisely stated problem. Start by separating the information supplied, the rule to apply, and the result required. An algorithm describes a finite sequence of unambiguous steps; it is independent of the programming language used later. A trace table records how values change after each step. Testing a single convenient example is insufficient: choose a normal case, a boundary case, and an invalid input. State assumptions rather than silently treating them as facts. A computed answer is correct only relative to the specification. For example, adding item prices does not include tax unless tax is part of the stated rule. Distinguish a programming error from an incomplete requirement: changing the code cannot resolve an unknown business rule.

**Worked example**

A shop sells three notebooks at 25 pesos each. Input is quantity 3 and unit price 25; processing is multiplication; output is 75 pesos. Trace quantity, price and total before writing code. Quantity zero should produce zero, while a negative quantity must be rejected by a later validation rule.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int quantity = 3, price = 25; printf("%d", quantity * price);
return 0;
}
```

Expected output: 75.

**Practice and evidence**

Write pseudocode and a trace table for purchasing 0, 1 and 4 notebooks at 25 pesos. Identify the invalid-input rule separately. Submit the specification, pseudocode and three traces.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Write pseudocode and a trace table for purchasing 0, 1 and 4 notebooks at 25 pesos. Identify the invalid-input rule separately. Submit the specification, pseudocode and three traces.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Inputs and output units are explicit
2. All three trace totals follow the stated rule
3. Negative quantities have an explicit rejection rule

#### Readiness check and instructor answer key

1. Which item is an input to the notebook calculation?

   A. Quantity purchased
   B. Computed total
   C. Program execution time
   D. Correctness verdict

   **Draft key: A.** Quantity purchased is supplied before calculating the total.

2. What total follows from quantity 4 and unit price 25?

   A. 29
   B. 100
   C. 625
   D. 21

   **Draft key: B.** Multiplying 4 by 25 gives a total of 100.

3. Why test quantity zero?

   A. It proves every input works
   B. It replaces a specification
   C. It checks a boundary case
   D. It forces an error

   **Draft key: C.** Zero is a boundary case that checks whether the algorithm handles no purchased items.

### Week 2: C programs and the build cycle

#### Learning material

**Concepts**

C source text is translated by a compiler before a native executable runs. Compilation checks many language rules, but successful compilation does not prove that the intended problem was solved. A declaration introduces a name and its type; a statement specifies an action. Execution of a hosted C program begins in main. Standard-library declarations come from headers such as stdio.h, which declares puts and printf. Braces delimit a block and most statements end with a semicolon. A missing semicolon can cause a diagnostic on a later line, so inspect the surrounding code. Read the first useful diagnostic, make one focused correction, rebuild, and run again. Keep the source file and the executable distinct; editing source does not change an executable that has not been rebuilt.

**Worked example**

The example prints a greeting. The shared example wrapper includes stdio.h and supplies int main(void). Compile with warnings enabled. Temporarily remove the statement terminator, observe the diagnostic, restore it and rebuild; the broken experiment is not the submitted working program.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
puts("Hello, EduPulse");
return 0;
}
```

Expected output: Hello, EduPulse.

**Practice and evidence**

Create a C program that prints a course name on one line. Record the build command, one intentional syntax diagnostic, its correction, and the final output. Submit source and the build log.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Create a C program that prints a course name on one line. Record the build command, one intentional syntax diagnostic, its correction, and the final output. Submit source and the build log.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. The submitted source builds with warnings enabled
2. The diagnostic is explained rather than hidden
3. Recorded output matches the rebuilt program

#### Readiness check and instructor answer key

1. Where does a hosted C program normally begin execution?

   A. stdio.h
   B. main
   C. The last source line
   D. The compiler warning list

   **Draft key: B.** The main function is the program entry point in a hosted C environment.

2. Which header declares puts?

   A. string.h
   B. math.h
   C. stdio.h
   D. time.h

   **Draft key: C.** stdio.h declares standard input and output functions including puts.

3. What does successful compilation establish?

   A. The code passed the compiler checks applied
   B. Every requirement is satisfied
   C. Every input was tested
   D. The algorithm is optimal

   **Draft key: A.** Compilation establishes that the source passed those compiler checks, not complete behavioral correctness.

### Week 3: Variables, types and initialization

#### Learning material

**Concepts**

A variable names an object that stores a value of a particular type. An int represents an integer within an implementation-defined range, while double represents floating-point values with limited precision. A char stores a character code; it is not a whole string. Initialization supplies a starting value when an object is declared. Reading an uninitialized automatic variable can produce undefined behavior, so do not treat an accidental output as a valid result. A name such as distance_km communicates a unit that a name such as x does not. Type choice follows the domain: a count is usually integral, while a measurement may require a fractional part. Floating-point arithmetic approximates many decimal fractions; compare results using the tolerance appropriate to the requirement, rather than assuming arbitrary decimal calculations are exact.

**Worked example**

Two tickets costing 12.50 pesos each produce a total of 25.00. The count is integral and the price uses double. The format %.2f requests two digits after the decimal point for display; it does not change how the value is stored.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int tickets = 2; double price = 12.50; double total = tickets * price; printf("%.2f", total);
return 0;
}
```

Expected output: 25.00.

**Practice and evidence**

Model a trip with passenger count, distance in kilometers and fare per kilometer. Explain each type and initialize every variable. Test two passenger counts and submit source plus a table of units and expected values.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Model a trip with passenger count, distance in kilometers and fare per kilometer. Explain each type and initialize every variable. Test two passenger counts and submit source plus a table of units and expected values.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Every variable is initialized before use
2. Type choices match counts or measurements
3. Displayed values and units agree with the specification

#### Readiness check and instructor answer key

1. Which C type is suitable for a fractional measurement?

   A. void
   B. double
   C. A function name
   D. A header name

   **Draft key: B.** double represents floating-point values and can represent fractional measurements approximately.

2. What should happen before reading an automatic local variable?

   A. Remove its type
   B. Assume it contains zero
   C. Initialize it or assign a valid value
   D. Print its address only

   **Draft key: C.** The variable must receive a valid value before its value is read.

3. What does %.2f control in printf?

   A. The displayed fractional digits
   B. The variable lifetime
   C. Integer overflow detection
   D. The number of function calls

   **Draft key: A.** The %.2f conversion displays a floating-point value with two digits after the decimal point.

### Week 4: Expressions and numeric calculations

#### Learning material

**Concepts**

An expression combines values and operators to compute a result. Multiplication, division and remainder bind more tightly than addition and subtraction; parentheses make the intended grouping explicit. When both operands of division are integers, C discards the fractional part of the quotient toward zero. Converting an operand to double before division permits a floating-point result. The remainder operator applies to integer operands and is useful for divisibility tests and grouping counts. Division by zero is invalid; check the divisor before performing the operation. Assignment stores a result and is different from equality comparison. Arithmetic also has range limits: signed integer overflow is undefined behavior, so select a suitable type and validate the input range. A mathematically correct formula still requires correct units, types, grouping and boundary handling in its implementation.

**Worked example**

For seven items packed three per box, integer division gives two full boxes and remainder gives one item left over. The fractional ratio is approximately 2.333333, not 2, when one operand is converted before division. Trace operand types before evaluating.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int items = 7, size = 3; printf("%d %d %.2f", items / size, items % size, (double)items / size);
return 0;
}
```

Expected output: 2 1 2.33.

**Practice and evidence**

Calculate full boxes and leftover items for quantities 0, 6 and 7 with box size 3. Add a check for box size zero. Submit expression traces and the corresponding C implementation.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Calculate full boxes and leftover items for quantities 0, 6 and 7 with box size 3. Add a check for box size zero. Submit expression traces and the corresponding C implementation.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Integer and floating-point calculations are distinguished
2. Boundary totals are correct
3. A zero divisor is rejected before evaluation

#### Readiness check and instructor answer key

1. What is 7 / 3 when both operands are int?

   A. 2
   B. 2.5
   C. 3
   D. 1

   **Draft key: A.** Integer division truncates the fractional part, giving 2.

2. What is 7 % 3?

   A. 0
   B. 2
   C. 1
   D. 3

   **Draft key: C.** The remainder after taking two groups of three from seven is 1.

3. Which expression performs floating-point division?

   A. 7 / 3
   B. (double)7 / 3
   C. 7 % 3
   D. 7 - 3

   **Draft key: B.** Converting an operand to double makes this a floating-point division.

### Week 5: Input, output and validation

#### Learning material

**Concepts**

External input is data that must be checked before it controls a calculation. fgets reads at most one less than the supplied buffer size and adds a terminating null character on success. Check its return value because input can end or fail. A newline can remain in the buffer. Parsing converts text into a value; successful conversion alone does not prove that the value is acceptable for the task. An age may be an integer but still be outside the allowed range. The small example checks sscanf conversion count and a domain bound. A production parser should also reject trailing nonnumeric text and detect range errors, for example using strtol with its end pointer and error checks. Avoid gets and unbounded string scans. Error paths should explain the input problem and avoid computing with an invalid or missing value.

**Worked example**

The test supplies the line 21. The program reads a bounded line, converts one integer, verifies an age between 0 and 130, and prints the accepted value. The additional cases abc and -1 should take the invalid branch. This introductory parser does not reject every trailing character.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
char line[32]; int age = 0; if (fgets(line, sizeof line, stdin) && sscanf(line, "%d", &age) == 1 && age >= 0 && age <= 130) printf("%d", age); else puts("Invalid age");
return 0;
}
```

Test input: 21. Expected output: 21.

**Practice and evidence**

Read a quantity with fgets, accept values from 0 to 100, and test valid input, negative input and text. Document the introductory parser limitation about trailing characters. Submit source and an input/output table.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Read a quantity with fgets, accept values from 0 to 100, and test valid input, negative input and text. Document the introductory parser limitation about trailing characters. Submit source and an input/output table.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Input reads are bounded and checked
2. Conversion and domain validation are separate
3. Invalid inputs do not reach the calculation

#### Readiness check and instructor answer key

1. What must be checked after fgets?

   A. Only the buffer name
   B. Its return value
   C. The source filename
   D. The compiler version alone

   **Draft key: B.** The return value indicates whether fgets successfully read input.

2. Why can an integer age still be invalid?

   A. All integers are invalid
   B. Integers cannot be read
   C. It may be outside the allowed domain
   D. A successful conversion proves validity

   **Draft key: C.** A converted value can still violate the task domain, such as a negative age.

3. Which input function must not be used because it cannot bound the buffer?

   A. gets
   B. fgets
   C. puts
   D. printf

   **Draft key: A.** gets cannot constrain the input length to the destination buffer size.

### Week 6: Selection with if and logical conditions

#### Learning material

**Concepts**

Selection chooses a path according to a condition. In C, zero is false and a nonzero scalar value is true. Relational operators compare values, while &&, || and ! combine or invert logical conditions. Use == for equality comparison; = performs assignment. The && and || operators short-circuit, which can protect a later operation when the earlier condition is false or true respectively. An else belongs to the closest unmatched if, so braces improve clarity. Translate the requirement into intervals before coding. For a threshold of 18, the values 17 and 18 exercise different branches. Several independent if statements can all run; an if/else-if chain selects at most one branch. Do not invent an institutional passing threshold: the example uses an explicit fictional age classification, not an academic grading policy.

**Worked example**

For a stated rule that an adult is at least 18 years old, age 18 follows the adult branch. Age 17 follows the other branch. A separate validation rule is still needed for impossible ages; branch logic does not automatically validate the domain.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int age = 18; if (age >= 18) puts("Adult"); else puts("Under 18");
return 0;
}
```

Expected output: Adult.

**Practice and evidence**

Implement a parcel rule: weight must be positive; weights up to 5 kilograms are small and larger weights are large. Test 0, 4.9, 5 and 5.1. Submit the interval specification and branch traces.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Implement a parcel rule: weight must be positive; weights up to 5 kilograms are small and larger weights are large. Test 0, 4.9, 5 and 5.1. Submit the interval specification and branch traces.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. The invalid branch is distinct
2. The value 5 belongs to exactly one class
3. Every branch has a documented test

#### Readiness check and instructor answer key

1. Which operator tests equality?

   A. =
   B. ==
   C. +=
   D. ++

   **Draft key: B.** The == operator compares values for equality.

2. Which boundary cases test an age >= 18 rule?

   A. 17 and 18
   B. 1 and 2
   C. 100 and 101
   D. 18 and 18 only

   **Draft key: A.** The values 17 and 18 lie immediately on opposite sides of the decision boundary.

3. How many branches can an if/else-if/else chain select in one pass?

   A. Every branch
   B. Exactly two
   C. At most one
   D. None by definition

   **Draft key: C.** A single if/else-if/else chain selects at most one branch.

### Week 7: Multiway selection with switch

#### Learning material

**Concepts**

A switch selects a starting point using an integral controlling expression. Each case label is an integer constant expression. A matching label does not automatically terminate the selected statements; execution can continue into the following case unless a break, return or other control transfer stops it. This fallthrough can be useful when several cases share behavior, but accidental fallthrough produces incorrect menu actions. The default label handles values without a matching case and is especially helpful for invalid menu choices. A break exits the nearest loop or switch, not the entire program. Use an if chain for general ranges or complex Boolean conditions rather than forcing them into case labels. Test every documented command and at least one unsupported choice. Keep input validation separate from the action dispatched by the menu.

**Worked example**

The menu maps 1 to Add and 2 to List. With choice 2, the List branch runs and break ends the switch. Removing break after case 1 would also run the List branch for choice 1, violating the one-command requirement.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int choice = 2; switch (choice) { case 1: puts("Add"); break; case 2: puts("List"); break; default: puts("Invalid"); }
return 0;
}
```

Expected output: List.

**Practice and evidence**

Build a three-command menu for add, list and exit. Test all commands and an unsupported value. Explain one intentionally shared case separately from the submitted one-command design.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Build a three-command menu for add, list and exit. Test all commands and an unsupported value. Explain one intentionally shared case separately from the submitted one-command design.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Every command produces its stated action
2. Unsupported input reaches default
3. No unintended fallthrough occurs

#### Readiness check and instructor answer key

1. What usually prevents accidental switch fallthrough?

   A. A case label alone
   B. A break statement
   C. A comment alone
   D. A variable name

   **Draft key: B.** break transfers control out of the switch before the next case statements execute.

2. Which label handles an unmatched menu value?

   A. default
   B. main
   C. include
   D. else if

   **Draft key: A.** The default label handles values that match no case label.

3. Which controlling expression is suitable for switch?

   A. A whole string
   B. An array of doubles
   C. An integer menu choice
   D. An input file itself

   **Draft key: C.** A switch uses an integral controlling expression such as an integer menu choice.

### Week 8: Repetition with while and do-while

#### Learning material

**Concepts**

Repetition performs a body while a condition permits it. A while loop checks its condition before entering the body and can run zero times. A do-while checks after the body and therefore runs at least once. Initialize state before the first condition test. Update the state so progress toward termination is visible. A counter records how many iterations have run; an accumulator combines their results. Keep the invariant, the condition that should remain true at each iteration, separate from the exit condition. For summing 1 through n, the accumulator contains the sum of the values already processed. An off-by-one error includes one value too many or too few. Test an empty or smallest permitted range, a single iteration and a normal range. Bound the input to avoid signed integer overflow.

**Worked example**

The loop starts at i = 1 and sum = 0. After processing 1, 2, 3 and 4, sum is 10 and i is 5, so i <= 4 becomes false. The update occurs in every iteration; omitting it would prevent termination.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int i = 1, sum = 0; while (i <= 4) { sum += i; i++; } printf("%d", sum);
return 0;
}
```

Expected output: 10.

**Practice and evidence**

Sum the integers from 1 through n for n between 0 and 100. Supply traces for 0, 1 and 4, then compare a while implementation with an equivalent for implementation after the midterm.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Sum the integers from 1 through n for n between 0 and 100. Supply traces for 0, 1 and 4, then compare a while implementation with an equivalent for implementation after the midterm.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Accumulator initialization is correct
2. The intended final value is included
3. Termination and range bounds are explained

#### Readiness check and instructor answer key

1. Which loop tests its condition after executing the body?

   A. while
   B. do-while
   C. if
   D. switch

   **Draft key: B.** A do-while loop executes its body before testing the condition.

2. What is the sum of 1 through 4?

   A. 4
   B. 8
   C. 10
   D. 16

   **Draft key: C.** Adding 1, 2, 3 and 4 gives 10.

3. What does an accumulator do?

   A. Combines results across iterations
   B. Replaces every condition
   C. Guarantees termination by itself
   D. Declares a header

   **Draft key: A.** An accumulator combines values produced or visited by repeated iterations.

### Week 10: for loops and nested iteration

#### Learning material

**Concepts**

A for loop groups initialization, a condition and an update around a repeated body. The initialization runs once, the condition is checked before each iteration, and the update follows each completed body. A variable declared in the initialization is scoped to the loop. Nested loops run one complete inner loop for each outer iteration. A two-row, three-column traversal therefore visits six positions. The inner counter must restart for every row. Use distinct names for row and column to make traces readable. break exits only the nearest loop; continue skips to that loop's next iteration step. A compact expression is not automatically clearer than explicit statements. Estimate the amount of work before executing large nested bounds, and test the first and last visited positions to reveal missing or extra iterations.

**Worked example**

The outer loop visits rows 0 and 1. For each row, the inner loop visits columns 0, 1 and 2. The counter increases once for every pair, producing six visits. This counts positions; it does not allocate a matrix.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int visits = 0; for (int row = 0; row < 2; row++) for (int col = 0; col < 3; col++) visits++; printf("%d", visits);
return 0;
}
```

Expected output: 6.

**Practice and evidence**

Print a 3-by-4 coordinate grid and record the first and last pair. Trace how the inner loop restarts. Submit source, expected output and the total visit count.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Print a 3-by-4 coordinate grid and record the first and last pair. Trace how the inner loop restarts. Submit source, expected output and the total visit count.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Bounds produce exactly twelve coordinate pairs
2. The inner counter restarts each row
3. The trace distinguishes row and column changes

#### Readiness check and instructor answer key

1. How many visits occur in a 2-by-3 traversal?

   A. 2
   B. 3
   C. 5
   D. 6

   **Draft key: D.** Two outer iterations each run three inner iterations, giving six visits.

2. When does a for-loop initialization normally run?

   A. Once before condition testing
   B. After every statement
   C. Only after exit
   D. It never runs

   **Draft key: A.** The initialization executes once before the loop condition is first tested.

3. Which loop does break exit in nested loops?

   A. All loops automatically
   B. The nearest enclosing loop
   C. Only main
   D. Only the outermost loop

   **Draft key: B.** break exits the nearest enclosing loop or switch.

### Week 11: Functions and decomposition

#### Learning material

**Concepts**

A function gives a name and interface to a coherent operation. Its contract states what input is accepted and what result or effect is produced. Parameters receive argument values, and a return statement supplies a result to the caller. C passes arguments by value: changing a simple parameter does not change the caller's variable. A pointer parameter can provide access to an object, but that pointer value is also passed by value. Local variables belong to their scope and their lifetime must be respected. A function declaration or definition must be visible before a call that needs it. Prefer small functions with one purpose over a single large main. Test functions independently with normal and boundary inputs, then test their composition. A function name should express its responsibility rather than merely repeat its return type.

**Worked example**

square receives a copy of 5 and returns its product with itself. main prints 25. The input domain is intentionally small; squaring arbitrary int values can overflow, so the reusable contract must specify an acceptable range or use checked arithmetic.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
static int square(int value) { return value * value; }
int main(void) {
printf("%d", square(5));
return 0;
}
```

Expected output: 25.

**Practice and evidence**

Write functions for a bounded integer square and a rectangle area. State permitted input ranges, test zero and normal cases, and call both from main. Submit contracts, source and expected outputs.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Write functions for a bounded integer square and a rectangle area. State permitted input ranges, test zero and normal cases, and call both from main. Submit contracts, source and expected outputs.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Function interfaces match their contracts
2. Inputs are within safe numeric ranges
3. Independent and combined tests are recorded

#### Readiness check and instructor answer key

1. How does C pass ordinary function arguments?

   A. By value
   B. Always by reference
   C. By filename
   D. By compilation order only

   **Draft key: A.** C passes argument values into parameter objects.

2. What does square(5) return in this example?

   A. 5
   B. 10
   C. 25
   D. 0

   **Draft key: C.** The function multiplies 5 by 5 and returns 25.

3. What belongs in a function contract?

   A. Only a decorative title
   B. Accepted inputs and promised result
   C. Every unrelated variable
   D. A claim that testing is unnecessary

   **Draft key: B.** A function contract specifies valid inputs and the result or effects promised.

### Week 12: Arrays and bounded traversal

#### Learning material

**Concepts**

An array stores a fixed sequence of elements of one type. For an array with n elements, valid indices run from zero through n minus one. Access outside those bounds is undefined behavior, even if a particular run seems to work. C does not automatically check each array index. Keep a length alongside data when passing an array to a function; a parameter written with array syntax is adjusted to a pointer parameter and does not retain the original element count. For a local actual array, sizeof array divided by sizeof array[0] can determine its element count. This calculation is not valid for recovering an array length from a pointer parameter. Traversal commonly uses i < length, rather than i <= length. Initialize an accumulator and consider the empty-array policy when writing reusable processing functions.

**Worked example**

The three values 2, 4 and 6 have indices 0, 1 and 2. The loop condition i < 3 visits exactly those elements and produces the sum 12. Index 3 would be beyond the array and must not be read.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
int values[] = {2, 4, 6}; int sum = 0; for (int i = 0; i < 3; i++) sum += values[i]; printf("%d", sum);
return 0;
}
```

Expected output: 12.

**Practice and evidence**

Process five daily item counts and compute their sum and maximum. Pass the length explicitly to any processing function. Submit tests with all zeros, repeated values and a maximum at the final position.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Process five daily item counts and compute their sum and maximum. Pass the length explicitly to any processing function. Submit tests with all zeros, repeated values and a maximum at the final position.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. All indices are strictly below length
2. Sum and maximum match independent calculations
3. The last array element is included

#### Readiness check and instructor answer key

1. What is the final valid index of a three-element array?

   A. 3
   B. 2
   C. 1
   D. 4

   **Draft key: B.** Zero-based indexing gives valid indices 0, 1 and 2.

2. Which loop condition visits indices 0 through length - 1?

   A. i <= length
   B. i > length
   C. i < length
   D. i == length + 1

   **Draft key: C.** The condition i < length excludes the out-of-bounds index length.

3. What should accompany an array passed to a processing function?

   A. Its element count
   B. Only a comment color
   C. An assumed infinite bound
   D. The compiler warning text

   **Draft key: A.** The function needs an explicit element count to bound its traversal.

### Week 13: Strings and text boundaries

#### Learning material

**Concepts**

A C string is a sequence of characters terminated by a null character. Storage capacity must include room for that terminator. The literal CAT has three visible characters and needs four char elements when stored as a string. strlen counts characters before the terminator and does not count the terminator itself. It assumes a valid terminated string; it cannot safely discover the end of an arbitrary unterminated buffer. strcmp compares string contents and returns zero when the strings are equal. Comparing two char pointers with == compares addresses rather than their text. When reading text, preserve capacity bounds and account for any newline retained by fgets. Avoid copying an arbitrary string into a fixed buffer without checking the required space. Character encodings also matter: a byte count is not a universal count of human-readable characters.

**Worked example**

The example stores CAT in a four-byte array, measures length three, and verifies equal text with strcmp. The equality expression prints 1 because strcmp returned zero. Changing the buffer to char word[3] would remove room for a terminating null in this initialization.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
char word[] = "CAT"; printf("%zu %d", strlen(word), strcmp(word, "CAT") == 0);
return 0;
}
```

Expected output: 3 1.

**Practice and evidence**

Read a bounded item label, remove a trailing newline when present, and compare it with a documented command word. Submit tests for matching text, different text and the largest accepted label.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Read a bounded item label, remove a trailing newline when present, and compare it with a documented command word. Submit tests for matching text, different text and the largest accepted label.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. A terminator fits within the buffer
2. Text comparison uses a string operation
3. Length and capacity are reported separately

#### Readiness check and instructor answer key

1. How much char storage does the string CAT require including its terminator?

   A. 2
   B. 3
   C. 4
   D. 5

   **Draft key: C.** Three characters plus the terminating null require four char elements.

2. When does strcmp(a, b) indicate equal strings?

   A. When its result is zero
   B. Whenever the pointers differ
   C. Only when its result is one
   D. When either array is uninitialized

   **Draft key: A.** strcmp returns zero when the compared strings have equal contents.

3. What does strlen omit from its result?

   A. Every letter
   B. The terminating null character
   C. The first character
   D. All spaces always

   **Draft key: B.** strlen counts the characters before, but not including, the terminating null.

### Week 14: Records with structures

#### Learning material

**Concepts**

A structure groups named members that can have different types. A record for an inventory item can combine an integer identifier with a quantity and a unit price. Define the record around the required information rather than combining unrelated values only because they happen to be available. The dot operator accesses a member of a structure object; the arrow operator accesses a member through a pointer to a structure. Initialize members before reading them. An array of structures represents several records, and the same array bounds rules still apply. Whole-structure assignment copies member values, including array members, but pointer members still contain pointer values rather than deep copies of the objects they reference. Do not use raw memory comparison as a general substitute for comparing meaningful fields, because structures can contain padding bytes.

**Worked example**

The item structure holds id 7 and quantity 3. The expression item.quantity accesses the named member and prints 3. A later extension can add a price without encoding both unrelated meanings into a single integer.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
struct Item { int id; int quantity; }; struct Item item = {7, 3}; printf("%d", item.quantity);
return 0;
}
```

Expected output: 3.

**Practice and evidence**

Define an inventory record with identifier, bounded label and quantity. Store three initialized records and locate one by identifier. Submit the data definition, a search trace and tests for found and missing identifiers.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Define an inventory record with identifier, bounded label and quantity. Store three initialized records and locate one by identifier. Submit the data definition, a search trace and tests for found and missing identifiers.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Members represent distinct documented fields
2. Every record is initialized
3. The missing-record case is handled explicitly

#### Readiness check and instructor answer key

1. Which operator accesses a member of a structure object?

   A. %
   B. .
   C. &&
   D. #

   **Draft key: B.** The dot operator selects a member of a structure object.

2. Can a structure contain members of different types?

   A. Yes
   B. Only if all are int
   C. Only without a name
   D. No

   **Draft key: A.** A structure groups members that may have different types.

3. What is item.quantity in the example?

   A. 7
   B. 10
   C. 3
   D. 0

   **Draft key: C.** The initialized quantity member contains 3.

### Week 15: Text files and checked I/O

#### Learning material

**Concepts**

A file stream connects a program to stored input or output. fopen returns a stream pointer on success and a null pointer on failure. The opening mode controls whether content is read, replaced or appended; choosing write mode can truncate an existing file. Check return values from writing, reading and closing operations because storage can fail independently of the algorithm. End-of-file is not an ordinary character, and a failed read should be interpreted with the appropriate error checks. Keep the on-disk format explicit: saving two numbers requires a defined separator and a rule for invalid records. A file does not automatically validate its contents or remember a C structure definition. Close streams after use and preserve the original data when an update fails. The example uses a temporary stream so the exercise does not overwrite personal files.

**Worked example**

Run this example in a dedicated exercise directory: opening course-seed-file-exercise.txt with w+ replaces that exercise file if it exists. The program writes 42, rewinds, reads the integer, closes the stream and removes the exercise file. It checks creation, writing, conversion and cleanup. Do not change the filename to an existing personal document.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
const char *name = "course-seed-file-exercise.txt"; FILE *file = fopen(name, "w+"); if (!file) return 1; if (fputs("42", file) == EOF) { fclose(file); return 1; } rewind(file); int value = 0; if (fscanf(file, "%d", &value) != 1) { fclose(file); return 1; } printf("%d", value); if (fclose(file) == EOF) return 1; if (remove(name) != 0) return 1;
return 0;
}
```

Expected output: 42.

**Practice and evidence**

Save and reload three item counts using a temporary stream or a dedicated exercise file. Document the text format, invalid-record handling and cleanup. Submit a round-trip comparison and the source.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Save and reload three item counts using a temporary stream or a dedicated exercise file. Document the text format, invalid-record handling and cleanup. Submit a round-trip comparison and the source.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. The example avoids overwriting unrelated files
2. Open, read and write failures are checked
3. Reloaded records match the written records

#### Readiness check and instructor answer key

1. What can fopen return when opening fails?

   A. A guaranteed valid stream
   B. A null pointer
   C. The first file character
   D. The record count

   **Draft key: B.** fopen returns a null pointer when the stream cannot be opened.

2. Why is the file mode important?

   A. It only changes font size
   B. It proves all records are valid
   C. It can determine whether existing content is truncated
   D. It removes the need to close

   **Draft key: C.** A write-opening mode can truncate existing content, so mode selection affects data preservation.

3. What does rewind do for this example?

   A. Moves the position to the start
   B. Deletes the C source
   C. Sorts stored integers
   D. Changes the stream into an array

   **Draft key: A.** rewind moves the stream position back to the beginning before the read.

### Week 16: Testing, debugging and evidence

#### Learning material

**Concepts**

Testing compares an observed result with a result derived independently from the specification. Running a program without an expected answer is an observation, not a complete correctness check. Partition inputs into meaningful classes and choose boundary values where behavior changes. A regression test preserves a case that previously exposed a defect so later edits can be checked against it. Debugging is the process of locating the cause, not merely changing statements until one output looks convenient. Reproduce the problem, minimize the case, inspect state and make a focused repair. Compiler warnings and runtime analysis tools can expose risks that ordinary examples miss, but no single tool proves general correctness. Record the environment and command used so another person can repeat the check. Protect personal data by using fictional exercise inputs in test logs.

**Worked example**

The predicate valid_quantity accepts 0 through 100 inclusive. Inputs -1, 0, 100 and 101 should yield false, true, true and false. Those expectations come from the interval specification before the implementation is run.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
static int valid_quantity(int q) { return q >= 0 && q <= 100; }
int main(void) {
printf("%d %d %d %d", valid_quantity(-1), valid_quantity(0), valid_quantity(100), valid_quantity(101));
return 0;
}
```

Expected output: 0 1 1 0.

**Practice and evidence**

Introduce and repair an off-by-one defect in a bounded quantity check. Keep the failing case as a regression test. Submit the specification, before/after code, expected results and actual results.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Introduce and repair an off-by-one defect in a bounded quantity check. Keep the failing case as a regression test. Submit the specification, before/after code, expected results and actual results.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Expectations are independently justified
2. Boundary tests expose the defect
3. The repaired implementation passes the retained regression case

#### Readiness check and instructor answer key

1. Which values test both boundaries of the inclusive interval 0 to 100?

   A. -1, 0, 100, 101
   B. 20, 30, 40, 50
   C. 1, 1, 1, 1
   D. Only 50

   **Draft key: A.** The four values test immediately outside and exactly on both boundaries.

2. What is a regression test?

   A. A replacement for a specification
   B. A retained check for previously working or repaired behavior
   C. A random grade
   D. A comment without execution

   **Draft key: B.** A regression test checks that later changes preserve behavior already established or repaired.

3. What is needed to assess a test output?

   A. Only a screenshot
   B. Only a source filename
   C. An independently justified expected result
   D. A larger font

   **Draft key: C.** An expected result justified by the specification allows actual behavior to be assessed.

### Week 17: Integrated structured-programming project

#### Learning material

**Concepts**

Integration combines individually understandable operations into a complete solution. Begin with a modest specification that can be tested end to end: record a few nonnegative item counts, compute a total and display a clear summary. Keep input handling, domain checks and calculations separate so each can be tested independently. A shared data representation prevents each function from interpreting fields differently. Preserve explicit bounds on every collection and numeric range. Document what the program intentionally does not handle, such as concurrent users or a production database, instead of claiming those capabilities through a menu label. Review whether error paths preserve earlier valid information. The project evidence should include source, build instructions, the input format and expected/actual comparisons. A polished screen is not a substitute for correct saved data or a reproducible calculation.

**Worked example**

The bounded exercise has counts 2, 3 and 4, giving total 9. The function receives both the array and its length, then accumulates the values. Before using this function with user data, validate each count and ensure the total cannot exceed the chosen type range.

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
static int total_counts(const int *values, int length) { int total = 0; for (int i = 0; i < length; i++) total += values[i]; return total; }
int main(void) {
int counts[] = {2, 3, 4}; printf("%d", total_counts(counts, 3));
return 0;
}
```

Expected output: 9.

**Practice and evidence**

Deliver a three-record inventory program with validation, a summary function and a documented text export. Submit source, build instructions, sample files and repeatable tests, including invalid input and an empty collection policy.

**References**

- [GNU C Language Introduction and Reference Manual](https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html)
- [Harvard CS50: C](https://cs50.harvard.edu/x/weeks/1/)

#### Activity

**Task and submission**

Deliver a three-record inventory program with validation, a summary function and a documented text export. Submit source, build instructions, sample files and repeatable tests, including invalid input and an empty collection policy.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. The program satisfies its stated scope
2. Data boundaries and error paths are tested
3. Another learner can reproduce the build and results

#### Readiness check and instructor answer key

1. Why pass both values and length to total_counts?

   A. To supply a safe traversal bound
   B. To assign an academic grade
   C. To allocate infinite storage
   D. To skip every test

   **Draft key: A.** The explicit length gives the function a bound for traversing the supplied values.

2. What total follows from 2, 3 and 4?

   A. 7
   B. 8
   C. 9
   D. 12

   **Draft key: C.** The sum of the three counts is 9.

3. What provides strong project evidence?

   A. Only a success message
   B. Repeatable build steps and expected/actual tests
   C. An untested menu mockup
   D. A claim that no defects exist

   **Draft key: B.** Repeatable build instructions and justified expected/actual comparisons substantiate the implemented behavior.


## IT 202

### Week 2: Data representation and transmission

#### Learning material

**Concepts**

A bit is a binary digit with two possible values. A byte conventionally contains eight bits; byte counts and bit rates therefore use different units. Character encoding assigns numeric representations to text. ASCII covers a limited character repertoire, while UTF-8 represents Unicode code points using a variable number of bytes. A character count and a byte count need not be equal. Transmission carries represented data across a medium using signals. Simplex communication is one-way, half-duplex alternates direction, and full-duplex permits both directions at the same time. Bandwidth, throughput and latency answer different questions: an advertised capacity is not a guarantee that an application will achieve that rate. Protocol overhead and competing traffic also consume capacity. Keep the representation of information separate from the physical signal used to carry it.

**Worked example**

The binary value 01000001 equals decimal 65, which represents A in ASCII and in the one-byte UTF-8 encoding of that character. Sending 1,000 bytes requires 8,000 payload bits. At an ideal payload rate of 1,000 bits per second it takes 8 seconds; framing overhead would increase the actual transfer time.

**Practice and evidence**

Encode the letters A and B as eight-bit binary values, then estimate an ideal transfer time for 2,000 bytes at 4,000 bits per second. Label payload-only assumptions. Submit the conversions and a transmission-mode comparison table.

**References**

- [Unicode: UTF-8, UTF-16, UTF-32 and BOM FAQ](https://www.unicode.org/faq/utf_bom.html)

#### Activity

**Task and submission**

Encode the letters A and B as eight-bit binary values, then estimate an ideal transfer time for 2,000 bytes at 4,000 bits per second. Label payload-only assumptions. Submit the conversions and a transmission-mode comparison table.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Binary place values produce the stated decimal codes
2. Bits and bytes are not mixed
3. Transfer estimates identify excluded overhead

#### Readiness check and instructor answer key

1. How many bits are in a conventional byte?

   A. 4
   B. 8
   C. 16
   D. 64

   **Draft key: B.** A conventional byte contains eight bits.

2. What is the decimal value of 01000001?

   A. 64
   B. 66
   C. 65
   D. 128

   **Draft key: C.** The set bits represent 64 plus 1, giving 65.

3. Which mode permits simultaneous transmission in both directions?

   A. Full-duplex
   B. Simplex
   C. Half-duplex
   D. Offline storage

   **Draft key: A.** Full-duplex supports transmission in both directions at the same time.

### Week 3: OSI and TCP/IP models

#### Learning material

**Concepts**

Layered models separate networking responsibilities so a problem can be investigated without treating every component as one mechanism. The OSI model names physical, data-link, network, transport, session, presentation and application layers. The Internet model commonly groups responsibilities into link, internet, transport and application layers. These are explanatory models, not a requirement that every real software component fit exactly one box. Ethernet operates at the local link, IP carries datagrams between networks, and transport protocols provide communication services to applications. TCP provides a reliable ordered byte stream; UDP carries datagrams without that same reliability service. Reliability at transport does not prove that an application accepted or correctly processed a transaction. Encapsulation adds protocol control information as data moves down a stack. At the receiver, corresponding processing interprets those headers before delivering application data.

**Worked example**

A browser request can be carried by HTTP over TCP over IP over an Ethernet link. The Ethernet frame reaches the next local hop; routers forward IP packets toward the destination. TCP handles stream delivery, while HTTP defines the request meaning. This is one example stack, not a claim that all web traffic uses TCP.

**Practice and evidence**

Draw the encapsulation of a single application message and map Ethernet, IP, TCP and HTTP to both models. Diagnose a disconnected cable separately from a reachable server returning an application error. Submit a labelled diagram and fault table.

**References**

- [IETF RFC 1122: Requirements for Internet Hosts](https://www.rfc-editor.org/info/rfc1122/)
- [IETF RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/info/rfc9293/)
- [IETF RFC 768: User Datagram Protocol](https://www.rfc-editor.org/info/rfc768/)

#### Activity

**Task and submission**

Draw the encapsulation of a single application message and map Ethernet, IP, TCP and HTTP to both models. Diagnose a disconnected cable separately from a reachable server returning an application error. Submit a labelled diagram and fault table.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. The OSI layers are in order
2. Local delivery and routed delivery are distinguished
3. An application error is not called a cable failure

#### Readiness check and instructor answer key

1. Which protocol provides a reliable ordered byte stream?

   A. UDP
   B. TCP
   C. ARP
   D. Ethernet alone

   **Draft key: B.** TCP provides a reliable ordered byte-stream transport service.

2. Which OSI layer is responsible for inter-network packet forwarding?

   A. Presentation
   B. Session
   C. Network
   D. Physical

   **Draft key: C.** The network layer covers packet addressing and forwarding between networks.

3. What does encapsulation add?

   A. Protocol control information around carried data
   B. An institutional grade
   C. A new keyboard layout
   D. Guaranteed application correctness

   **Draft key: A.** Encapsulation adds the control information needed by a protocol to carry its payload.

### Week 4: Ethernet and transmission media

#### Learning material

**Concepts**

Ethernet is a family of link technologies standardized within IEEE 802.3. An Ethernet frame carries source and destination MAC addresses, type or length information, a payload and a frame check sequence. Switching forwards frames using learned destination information. Wired Ethernet and wireless LANs differ in their media access mechanisms; a wireless access point does not turn radio into a collision-free wired link. Twisted-pair copper and optical fiber have different distance, installation and interference considerations. A cable category alone does not guarantee a negotiated speed: endpoint capabilities, length, connectors and installation quality matter. Historical shared half-duplex Ethernet used collision detection; modern switched full-duplex links do not use collisions as their normal access method. Verify link state and negotiated parameters before interpreting a slow file transfer as proof of a bad cable.

**Worked example**

Two PCs connect to separate ports of a full-duplex switch. A physical link can be up while IP configuration is wrong, so an illuminated link indicator proves less than successful application access. Record cable type, link state and negotiated speed, then test the IP configuration separately.

**Practice and evidence**

In an isolated lab or simulator, connect two hosts through a switch. Compare a correct cable connection with a disconnected link, record interface state, and explain why a successful link does not establish complete end-to-end service. Submit a diagram and observations.

**References**

- [IEEE 802.3 Ethernet Working Group](https://www.ieee802.org/3/)

#### Activity

**Task and submission**

In an isolated lab or simulator, connect two hosts through a switch. Compare a correct cable connection with a disconnected link, record interface state, and explain why a successful link does not establish complete end-to-end service. Submit a diagram and observations.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Media selection is justified
2. Link observations are distinguished from IP tests
3. Full-duplex behavior is not described as collision-based

#### Readiness check and instructor answer key

1. Which address is used for ordinary Ethernet frame forwarding?

   A. A document title
   B. A MAC address
   C. A student number
   D. A TCP port alone

   **Draft key: B.** Ethernet switching uses link-layer MAC addresses for frame forwarding.

2. What does a link-up indication establish?

   A. Every application works
   B. All routes are correct
   C. A physical/link connection is present
   D. The DNS zone is correct

   **Draft key: C.** Link-up indicates a link connection, not complete IP or application correctness.

3. Which statement describes modern full-duplex switched Ethernet?

   A. It does not use collisions as its normal access method
   B. It requires every host to collide first
   C. It cannot carry IP
   D. It always uses radio

   **Draft key: A.** Full-duplex switched Ethernet sends and receives without collision-based medium sharing.

### Week 5: MAC, IPv4 and IPv6 addresses

#### Learning material

**Concepts**

Different address types serve different scopes. A MAC address identifies a link-layer interface for local frame delivery; it can be changed or locally administered and is not an infallible permanent device identity. IPv4 addresses are 32 bits long. IPv6 addresses are 128 bits long and use hexadecimal groups in their textual form. An IP address and prefix describe logical network membership; routing uses that logical structure. A host sending to a remote network normally resolves the next-hop gateway's link address rather than the remote server's MAC address. IPv6 uses Neighbor Discovery rather than IPv4 ARP. Textual compression does not change the number of address bits: a double colon can abbreviate one sequence of zero groups and cannot appear twice in a valid address. Documentation prefixes are reserved for examples and must not be presented as public addresses allocated to the school.

**Worked example**

Use MAC 02:00:00:00:00:01 as a locally administered example, IPv4 192.0.2.10 as a documentation address, and IPv6 2001:db8::10 as a documentation example. The abbreviated IPv6 text still represents a 128-bit address. These are instructional values, not discovered addresses on a student device.

**Practice and evidence**

Classify six supplied example addresses by type, expand one compressed IPv6 address, and draw the link destination for a packet sent through a gateway. Submit classifications and the next-hop diagram.

**References**

- [IETF RFC 4291: IPv6 Addressing Architecture](https://www.rfc-editor.org/info/rfc4291/)
- [IETF RFC 826: Ethernet Address Resolution Protocol](https://www.rfc-editor.org/info/rfc826/)
- [IETF RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/info/rfc5737/)

#### Activity

**Task and submission**

Classify six supplied example addresses by type, expand one compressed IPv6 address, and draw the link destination for a packet sent through a gateway. Submit classifications and the next-hop diagram.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Address sizes and notation are correct
2. IPv6 compression is expanded unambiguously
3. The gateway MAC is distinguished from the remote IP destination

#### Readiness check and instructor answer key

1. How many bits are in an IPv6 address?

   A. 32
   B. 48
   C. 64
   D. 128

   **Draft key: D.** An IPv6 address has 128 bits.

2. What does an IPv4 address contain?

   A. 32 bits
   B. 128 bits
   C. A MAC vendor name only
   D. A fixed student identity

   **Draft key: A.** An IPv4 address is 32 bits long.

3. For a remote IPv4 destination on an Ethernet-connected host, which MAC is normally resolved first?

   A. The remote server MAC across the Internet
   B. The next-hop gateway MAC
   C. Every Internet host MAC
   D. No link address is ever needed

   **Draft key: B.** The host resolves its local next-hop gateway MAC to send the frame toward a remote network.

### Week 6: IPv4 prefixes, CIDR and VLSM

#### Learning material

**Concepts**

A CIDR prefix states how many high-order bits identify an IPv4 network. A /26 leaves six host bits and contains 64 addresses. In a conventional multiaccess subnet, the all-zero host value identifies the network and the all-one host value identifies its directed broadcast, leaving 62 ordinary host addresses. Point-to-point /31 and host /32 uses require different reasoning; do not apply the subtract-two rule blindly. Modern routing uses classless prefixes. Historical address classes explain older conventions but do not determine the mask of every current address. Private ranges are an address-use classification, not an address class. VLSM assigns different prefix lengths to differently sized groups. Allocate larger blocks first, respect prefix boundaries, and check every allocation for overlap. A valid address plan must also reserve space for gateways and infrastructure within the actual host requirement.

**Worked example**

For 192.0.2.0/26, the network is 192.0.2.0, broadcast is 192.0.2.63, and ordinary hosts are .1 through .62. Within a /24, groups needing 60, 30 and 12 ordinary hosts can use 192.0.2.0/26, 192.0.2.64/27 and 192.0.2.96/28. These blocks do not overlap.

**Practice and evidence**

Create a VLSM table for 60, 30 and 12 hosts within 192.0.2.0/24, counting required gateway addresses. Record each mask, network, usable range and broadcast. Check whether the given host counts already include infrastructure.

**References**

- [IETF RFC 4632: Classless Inter-domain Routing](https://www.rfc-editor.org/info/rfc4632/)
- [IETF RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/)
- [IETF RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links](https://www.rfc-editor.org/info/rfc3021/)

#### Activity

**Task and submission**

Create a VLSM table for 60, 30 and 12 hosts within 192.0.2.0/24, counting required gateway addresses. Record each mask, network, usable range and broadcast. Check whether the given host counts already include infrastructure.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Prefix sizes meet the explicit host requirement
2. All blocks start at valid boundaries
3. No allocated ranges overlap

#### Readiness check and instructor answer key

1. How many total IPv4 addresses are in a /26?

   A. 26
   B. 32
   C. 64
   D. 128

   **Draft key: C.** A /26 leaves six host bits, so it contains 2 to the sixth power, or 64 addresses.

2. What is the broadcast address for 192.0.2.0/26?

   A. 192.0.2.63
   B. 192.0.2.64
   C. 192.0.2.255
   D. 192.0.2.1

   **Draft key: A.** The 64-address block ends at 192.0.2.63, its conventional directed broadcast address.

3. Which mechanism supports different subnet sizes in one parent block?

   A. A mandatory /8 mask
   B. VLSM
   C. A MAC vendor prefix
   D. An HTTP status code

   **Draft key: B.** Variable Length Subnet Masking assigns different prefix lengths within an address plan.

### Week 7: Static configuration and DHCP

#### Learning material

**Concepts**

A usable IPv4 configuration includes an address, a prefix or subnet mask, and the additional settings needed for the intended communication. A default gateway handles destinations without a more specific local route; DNS resolves names and is a separate service. Static assignment records values manually, so the administrator must prevent duplicates. DHCP can lease an address and supply configuration options. Its initial exchange is commonly described as Discover, Offer, Request and Acknowledge; renewal behavior is not identical to a first lease acquisition. A lease is temporary allocation state, not proof that a device is authorized for every network resource. Exclude statically allocated infrastructure from a dynamic pool. On Windows, ipconfig /all can help inspect current values, but changing a real adapter requires authorization and should not be part of an uncontrolled class exercise. Use a simulator or isolated lab.

**Worked example**

In a fictional 192.168.10.0/24 lab, reserve .1 for the gateway and .2 through .20 for infrastructure. A dynamic pool of .100 through .150 avoids those reservations. A client configured as .101/24 can reach .1 locally. DNS failure can break name-based access even while an IP connectivity test succeeds.

**Practice and evidence**

Configure one simulated host statically and another with DHCP. Record address, prefix, gateway, resolver and lease details. Test local reachability separately from name resolution. Submit the pool plan and observed configuration without exposing real device data.

**References**

- [IETF RFC 2131: Dynamic Host Configuration Protocol](https://www.rfc-editor.org/info/rfc2131/)
- [IETF RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/)

#### Activity

**Task and submission**

Configure one simulated host statically and another with DHCP. Record address, prefix, gateway, resolver and lease details. Test local reachability separately from name resolution. Submit the pool plan and observed configuration without exposing real device data.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Static reservations and the pool do not overlap
2. Gateway placement matches the subnet
3. DNS and IP connectivity are tested separately

#### Readiness check and instructor answer key

1. Which service commonly leases IPv4 addresses?

   A. ARP
   B. DHCP
   C. HTTP
   D. SMTP

   **Draft key: B.** DHCP distributes host configuration, including dynamically allocated IPv4 leases.

2. What should be excluded from a dynamic pool?

   A. Every valid client address forever
   B. All documentation
   C. Reserved static infrastructure addresses
   D. The DHCP message format

   **Draft key: C.** Excluding statically reserved infrastructure avoids duplicate allocation.

3. Which Windows command can inspect detailed IPv4 configuration?

   A. ipconfig /all
   B. format
   C. del
   D. shutdown

   **Draft key: A.** ipconfig /all displays detailed adapter configuration for inspection.

### Week 8: Cisco IOS navigation and saved configuration

#### Learning material

**Concepts**

A network device command-line interface uses operating modes to separate inspection from configuration. Typical Cisco IOS prompts distinguish user EXEC, privileged EXEC, global configuration and interface configuration. The exact commands and feature support depend on the platform and software image, so check contextual help and the lab device documentation. A running configuration describes current configuration state, while a startup configuration is used during a later boot. Saving configuration is a separate action from typing a command that changes the running state. Console access and remote access use different connection paths; losing remote reachability can require console recovery. Packet Tracer is an instructional simulator rather than proof that every hardware platform behaves identically. Keep an initial configuration copy, make one controlled change, inspect it, and document how to restore the lab to its original state.

**Worked example**

In an isolated simulator, enter enable, then configure terminal, then hostname LAB-SW1, followed by end. Inspect the changed hostname before saving with copy running-config startup-config. A changed prompt is evidence of that running setting; it does not alone prove that the startup configuration was saved.

**Practice and evidence**

Record the prompts for EXEC, privileged EXEC and configuration modes on a simulated device. Set a lab hostname, inspect the running setting, save it and verify the startup copy. Submit the command transcript and a restoration plan.

**References**

- [Cisco IOS XE: Configure VLAN Trunking](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html)

#### Activity

**Task and submission**

Record the prompts for EXEC, privileged EXEC and configuration modes on a simulated device. Set a lab hostname, inspect the running setting, save it and verify the startup copy. Submit the command transcript and a restoration plan.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Each command is associated with the correct mode
2. Running and startup configurations are distinguished
3. The saved state is inspected rather than assumed

#### Readiness check and instructor answer key

1. Which command commonly enters global configuration from privileged EXEC?

   A. configure terminal
   B. show clock
   C. ping
   D. logout only

   **Draft key: A.** configure terminal enters global configuration mode on typical Cisco IOS devices.

2. Which operation commonly saves the current configuration for startup?

   A. Only changing hostname
   B. copy running-config startup-config
   C. Only opening the console
   D. Clearing the screen

   **Draft key: B.** copy running-config startup-config saves the running configuration to the startup configuration.

3. What is Packet Tracer in this exercise?

   A. Evidence of a real institutional deployment
   B. A student gradebook
   C. An instructional network simulator
   D. A password recovery service

   **Draft key: C.** Packet Tracer is used as a network simulator for the exercise.

### Week 10: Switching, routing and ARP

#### Learning material

**Concepts**

A Layer 2 switch learns source MAC addresses from received frames and associates them with ports within a VLAN. A known unicast destination can be forwarded toward its learned port; an unknown unicast is normally flooded within that VLAN subject to forwarding state and policy. A managed switch exposes configuration and monitoring capabilities that a simple unmanaged device generally does not. A router forwards packets between IP networks using a routing table. Each VLAN is normally a separate broadcast domain; a full-duplex switched link does not form a shared collision domain. IPv4 ARP discovers the link-layer address associated with an on-link IPv4 next hop. ARP is local to the relevant link and is not a method for learning a remote server MAC through multiple routers. Inspect forwarding tables and host address configuration together when diagnosing a failed path.

**Worked example**

Host 192.168.10.10/24 sends to 192.168.20.10. Because the destination is off-link, the host selects its default gateway, ARPs for that gateway locally and sends a frame to the gateway MAC. The IP destination remains the remote host, even though the first Ethernet destination is the gateway.

**Practice and evidence**

Trace one same-subnet and one routed exchange in a simulator. Inspect the MAC table and ARP entries, then explain what is learned from each source frame. Submit a next-hop table and frame/packet address diagram.

**References**

- [IETF RFC 826: Ethernet Address Resolution Protocol](https://www.rfc-editor.org/info/rfc826/)
- [IETF RFC 1122: Requirements for Internet Hosts](https://www.rfc-editor.org/info/rfc1122/)

#### Activity

**Task and submission**

Trace one same-subnet and one routed exchange in a simulator. Inspect the MAC table and ARP entries, then explain what is learned from each source frame. Submit a next-hop table and frame/packet address diagram.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. MAC learning uses source addresses
2. Broadcast scope is limited to the VLAN
3. The Ethernet next hop and final IP destination are distinct

#### Readiness check and instructor answer key

1. Which address does a switch normally learn from an incoming frame?

   A. The source MAC
   B. Only the HTTP URL
   C. The remote website certificate
   D. A student username

   **Draft key: A.** The switch learns the incoming frame source MAC on its receiving port.

2. What does IPv4 ARP resolve on a local Ethernet link?

   A. A filename into a grade
   B. An on-link IPv4 next hop into its MAC address
   C. Every Internet route
   D. An IPv6 prefix into a password

   **Draft key: B.** ARP resolves an on-link IPv4 next-hop address to a link-layer address.

3. What normally separates broadcast domains?

   A. A shared document heading
   B. An identical keyboard
   C. A VLAN or routing boundary
   D. A compiler warning

   **Draft key: C.** VLAN and routing boundaries separate the scope of ordinary Layer 2 broadcasts.

### Week 11: Network architecture tradeoffs

#### Learning material

**Concepts**

An architecture organizes responsibilities and paths before individual ports are configured. A campus hierarchy commonly distinguishes access, distribution and core roles. Access connects endpoints, distribution aggregates and applies policy, and the core provides a resilient transport role. A collapsed-core design combines roles for a smaller deployment; it can reduce cost and complexity while concentrating some dependencies. A spine-leaf fabric connects each leaf to each spine and can support predictable paths for data-center traffic. It is not automatically the most appropriate design for a small classroom. Compare scale, traffic patterns, failure domains, operations effort and budget. Redundant physical links need a deliberate loop-prevention or routed design; simply drawing extra cables does not establish resilience. Distinguish the intended architecture from a verified implementation, and record what failure tests would substantiate the availability claim.

**Worked example**

A two-building training lab can use access switches and a redundant collapsed distribution/core pair. A large server environment with substantial server-to-server traffic may justify a spine-leaf fabric. The choice follows requirements and documented failure behavior, not a rule that a more complex diagram always performs better.

**Practice and evidence**

Compare a small-campus collapsed-core design with a spine-leaf design for a fictional 60-client teaching lab. State assumptions, equipment roles, one failure domain and a verification test. Submit two diagrams and a reasoned selection.

**References**

- [Cisco Campus LAN and Wireless LAN Solution Design Guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html)

#### Activity

**Task and submission**

Compare a small-campus collapsed-core design with a spine-leaf design for a fictional 60-client teaching lab. State assumptions, equipment roles, one failure domain and a verification test. Submit two diagrams and a reasoned selection.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Roles are identified independently of product names
2. The selected design matches stated scale and traffic
3. Availability claims have corresponding failure tests

#### Readiness check and instructor answer key

1. Which role usually connects end devices in a campus hierarchy?

   A. Access
   B. A document archive
   C. A DNS zone alone
   D. A compiler

   **Draft key: A.** The access role provides endpoint connectivity in a typical campus hierarchy.

2. What does a collapsed-core design do?

   A. Eliminates all failure risks
   B. Combines distribution and core roles
   C. Requires every host to be a router
   D. Replaces all IP addresses with MAC addresses

   **Draft key: B.** A collapsed-core design combines the distribution and core roles.

3. What should determine architecture selection?

   A. Diagram complexity alone
   B. The largest device count possible
   C. Requirements, traffic, scale and failure behavior
   D. A promise without tests

   **Draft key: C.** Architecture should be selected against the deployment requirements and verified operating tradeoffs.

### Week 12: Basic device configuration and secure handling

#### Learning material

**Concepts**

A useful configuration begins with identifiable devices, clear interface descriptions and an address plan. Hostnames and interface descriptions help operators interpret a topology, but they do not enforce access control. Management authentication requires unique secrets and appropriately restricted access methods. Traditional service password-encryption on older IOS configurations can produce reversible Type 7 obfuscation; it must not be described as strong password protection. Use supported stronger secret types and encrypted management transport according to the exact device documentation and institutional policy. A login banner states an access notice and is not an authorization mechanism by itself. Inspect the actual configuration with appropriate show commands, protect transcripts from exposing secrets, and save only after verifying the change. Interface addressing differs between router interfaces, switch virtual interfaces and Layer 2 switchports, so the correct context matters.

**Worked example**

Set a simulated device hostname LAB-R1 and a description such as Link to teaching switch. Inspect show ip interface brief and the relevant running interface configuration. Record address and administrative state without including secret values. A line saying administratively down calls for configuration review, not an unsupported claim that a cable was proven faulty.

**Practice and evidence**

Configure a lab hostname, access notice, interface description and management address on a simulator. Document the chosen secure management method and platform support. Submit redacted inspection output, a saved-state check and rollback instructions.

**References**

- [Cisco IOS Security Command Reference: enable and enable secret](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/d1/sec-d1-cr-book/sec-cr-e1.html)

#### Activity

**Task and submission**

Configure a lab hostname, access notice, interface description and management address on a simulator. Document the chosen secure management method and platform support. Submit redacted inspection output, a saved-state check and rollback instructions.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Configuration matches the interface role
2. No shared real secret appears in the submission
3. Obfuscation is distinguished from strong secret handling

#### Readiness check and instructor answer key

1. Which command commonly summarizes IP interface states?

   A. show ip interface brief
   B. Only hostname
   C. Only banner motd
   D. The browser reload command

   **Draft key: A.** show ip interface brief commonly lists interface IP addressing and state on Cisco IOS.

2. How should traditional Type 7 password handling be described?

   A. Strong irreversible hashing
   B. Reversible obfuscation
   C. A guarantee against disclosure
   D. A replacement for access control

   **Draft key: B.** Traditional Type 7 is reversible obfuscation and is not strong password protection.

3. What does an interface description primarily provide?

   A. Automatic encryption
   B. A student score
   C. Operational context for the link
   D. A routing protocol by itself

   **Draft key: C.** An interface description records useful operational context for the link.

### Week 13: VLAN membership and trunk links

#### Learning material

**Concepts**

A VLAN separates a switched network into logical Layer 2 broadcast domains. An access port commonly carries one data VLAN for an attached endpoint. A trunk carries traffic for multiple VLANs using a defined tagging scheme, commonly IEEE 802.1Q. The allowed VLAN list controls which VLANs traverse a trunk; it does not create an IP route between them. Both ends need compatible trunk and native VLAN settings. A VLAN must also exist where needed, and port forwarding state can affect delivery even when a VLAN number appears in configuration. Creating two VLANs is a segmentation step, not a complete security policy. A host in a different VLAN ordinarily needs an authorized Layer 3 path to communicate across the boundary. Verify endpoint membership and trunk carriage separately before adding routing, so a fault can be localized.

**Worked example**

Put two lab endpoints in VLAN 10 and two in VLAN 20. Carry VLANs 10 and 20 across the switch-to-switch trunk. Same-VLAN peers should communicate across that trunk when addressing and forwarding are correct; VLAN 10 to VLAN 20 communication needs a routed path and permitted policy.

**Practice and evidence**

Create VLANs 10 and 20 on two simulated switches, assign access ports, and configure a trunk allowing those two VLANs. Record show vlan brief and show interfaces trunk, then test same-VLAN communication across the link.

**References**

- [Cisco IOS XE: Configure VLAN Trunking](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html)

#### Activity

**Task and submission**

Create VLANs 10 and 20 on two simulated switches, assign access ports, and configure a trunk allowing those two VLANs. Record show vlan brief and show interfaces trunk, then test same-VLAN communication across the link.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Endpoint ports have the intended VLAN membership
2. Both trunk ends carry the required VLANs
3. Inter-VLAN routing is not falsely attributed to trunking

#### Readiness check and instructor answer key

1. What does a VLAN normally separate?

   A. Layer 2 broadcast domains
   B. Only source filenames
   C. C integer types
   D. Student year labels only

   **Draft key: A.** VLANs separate logical Layer 2 broadcast domains.

2. What is a trunk used for?

   A. Automatically grading learners
   B. Carrying multiple VLANs over a link
   C. Replacing every router
   D. Providing a compiler

   **Draft key: B.** A trunk link carries traffic belonging to multiple VLANs.

3. Does allowing VLANs 10 and 20 on a trunk by itself route between them?

   A. Always
   B. Only if the cable is blue
   C. No
   D. Only after clearing a browser cache

   **Draft key: C.** An allowed VLAN list permits VLAN carriage; inter-VLAN routing needs a Layer 3 function.

### Week 14: Inter-VLAN routing and policy verification

#### Learning material

**Concepts**

Inter-VLAN routing supplies a Layer 3 path between networks assigned to different VLANs. A router with tagged subinterfaces or a capable multilayer switch can provide that function. Each endpoint needs the appropriate subnet and gateway configuration. Establish the Layer 2 trunk and VLAN membership first, then verify Layer 3 interfaces and routes. A successful ping demonstrates a limited reachability observation for that protocol at that time; it does not prove that every application or policy requirement works. A failed ping can result from filtering and does not by itself prove that the route is absent. Define an allowed/denied communication matrix before testing segmentation. Restrict any test to a simulator or an explicitly authorized isolated lab. Record the exact endpoints and expected policy so both successful and intentionally blocked traffic can be interpreted correctly.

**Worked example**

VLAN 10 uses 192.168.10.0/24 with gateway .1 and VLAN 20 uses 192.168.20.0/24 with gateway .1. A routing device connects both networks. An allow rule may permit a teaching service while blocking a management service. Record the observed result for each stated rule rather than labelling all blocked traffic a network failure.

**Practice and evidence**

Extend the previous VLAN lab with an appropriate routing device. Define two allowed flows and one denied management flow, verify them in the simulator, and document endpoint addresses, gateways and results. Submit the matrix and configuration excerpts.

**References**

- [Cisco IOS XE: Configure VLAN Trunking](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html)
- [IETF RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/)

#### Activity

**Task and submission**

Extend the previous VLAN lab with an appropriate routing device. Define two allowed flows and one denied management flow, verify them in the simulator, and document endpoint addresses, gateways and results. Submit the matrix and configuration excerpts.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Each VLAN has a coherent subnet and gateway
2. Routing and allowed VLAN carriage are checked separately
3. Allowed and denied flows are both tested

#### Readiness check and instructor answer key

1. What enables ordinary communication between separate VLAN subnets?

   A. A Layer 3 routing function
   B. A hostname change alone
   C. Only the word trunk in a note
   D. A larger monitor

   **Draft key: A.** Inter-VLAN traffic requires a Layer 3 forwarding function and suitable configuration.

2. What does a successful ping directly show?

   A. Universal application correctness
   B. A limited ICMP reachability result
   C. Institutional approval
   D. All security rules are correct

   **Draft key: B.** A successful ping records ICMP reachability for the tested endpoints at that time.

3. Why test an intentionally denied flow?

   A. To assign a fictitious grade
   B. To remove the address plan
   C. To verify that the segmentation policy blocks it
   D. To prove all traffic must succeed

   **Draft key: C.** A denied-flow test checks whether the configured policy enforces the intended restriction.

### Week 15: Physical and virtual deployment planning

#### Learning material

**Concepts**

A deployment plan translates requirements into physical connections, logical networks and operational responsibilities. Physical documentation identifies devices, interfaces and media. Logical documentation identifies prefixes, VLANs, gateways and permitted service paths. A virtual switch connects virtual interfaces but does not automatically remove the need for addressing, segmentation or loop-aware design. Match every requirement to a configuration item and a test. Reserve capacity and addresses for infrastructure instead of counting only user endpoints. A lab plan should also state its isolation boundary so private example addressing is not confused with permission to change a real campus network. Keep secrets outside shared topology documents, identify the approved source of configuration truth, and define how the original state will be recovered if a change fails. Proposed availability is a design objective until failure behavior is actually tested.

**Worked example**

A fictional lab has student VLAN 10, instructor VLAN 20 and a separate management segment. The address table records a prefix and gateway for each, while the link table identifies the trunk carrying them. The acceptance matrix names permitted teaching access and denied student management access. None of these plan entries claim that the deployment has already happened.

**Practice and evidence**

Produce a physical diagram, logical diagram, address/VLAN table and acceptance matrix for a two-switch simulated teaching lab. Identify a virtual-machine connection and document the isolation boundary. Submit the plan before implementing changes.

**References**

- [Cisco Campus LAN and Wireless LAN Solution Design Guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html)
- [IETF RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/)

#### Activity

**Task and submission**

Produce a physical diagram, logical diagram, address/VLAN table and acceptance matrix for a two-switch simulated teaching lab. Identify a virtual-machine connection and document the isolation boundary. Submit the plan before implementing changes.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Every logical segment has documented addressing
2. Physical and logical diagrams agree
3. Requirements have named acceptance tests and rollback steps

#### Readiness check and instructor answer key

1. Which document maps IP prefixes and gateways?

   A. A logical address plan
   B. A source-code warning list
   C. A keyboard shortcut sheet
   D. A fictional score table

   **Draft key: A.** The logical address plan maps prefixes, gateways and their intended segments.

2. Does a virtual switch remove all segmentation requirements?

   A. Always
   B. No
   C. Only on a laptop
   D. Only after renaming it

   **Draft key: B.** Virtual networking still requires deliberate addressing and segmentation configuration.

3. What should accompany a proposed change?

   A. A claim of guaranteed success
   B. A real password in a public diagram
   C. Acceptance tests and a rollback plan
   D. Invented student completion dates

   **Draft key: C.** Acceptance tests and a rollback plan make a proposed deployment checkable and recoverable.

### Week 16: Controlled deployment and troubleshooting

#### Learning material

**Concepts**

A controlled deployment follows a recorded plan and validates each stage before proceeding. Start with physical and link state, then check VLAN membership, addressing, routing, name resolution and the actual application path. This order is a useful diagnostic strategy, not a rule that excludes all other reasoning. Change one relevant variable at a time and preserve the evidence that justified the change. A simulator success is evidence about the simulation; hardware behavior and production authorization need separate checks. Capture a baseline configuration before a deliberate fault, use a bounded failure such as a wrong access VLAN, and restore the intended state afterward. Do not invent a successful observation when a command was not run. A failed acceptance test should remain visible with its cause or unresolved status, even when several neighboring tests pass.

**Worked example**

A host has the correct IPv4 address but is attached to an access port in the wrong VLAN. Link state is up, while local gateway reachability fails. Inspecting membership identifies the mismatch. After correcting the simulated port and retesting, record both the original failure and the new observation with their timestamps.

**Practice and evidence**

Implement the previous week's plan in an isolated simulator. Introduce one wrong access VLAN, diagnose it using recorded observations, repair it and rerun the affected acceptance tests. Submit the initial fault, diagnosis, repair and retest evidence.

**References**

- [Cisco IOS XE: Configure VLAN Trunking](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html)
- [IETF RFC 1122: Requirements for Internet Hosts](https://www.rfc-editor.org/info/rfc1122/)

#### Activity

**Task and submission**

Implement the previous week's plan in an isolated simulator. Introduce one wrong access VLAN, diagnose it using recorded observations, repair it and rerun the affected acceptance tests. Submit the initial fault, diagnosis, repair and retest evidence.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Fault localization follows observed evidence
2. Only authorized simulated settings are changed
3. Retest results are recorded without hiding initial failures

#### Readiness check and instructor answer key

1. What does link-up alone prove in the wrong-VLAN example?

   A. Every route is valid
   B. A link connection exists
   C. The access VLAN is correct
   D. The application is authorized

   **Draft key: B.** Link-up establishes a link connection but does not verify VLAN membership or IP reachability.

2. What should follow a repair?

   A. Inventing an earlier success
   B. Deleting all evidence
   C. Rerunning affected acceptance tests
   D. Changing every unrelated setting

   **Draft key: C.** A repair needs retesting of affected acceptance criteria to establish the observed result.

3. Which record should remain in the report?

   A. The initial failure and subsequent retest
   B. Only a decorative success badge
   C. A made-up timestamp
   D. An unrelated student grade

   **Draft key: A.** Keeping the original failure and retest preserves an accurate troubleshooting record.

### Week 17: Deployment handover and bounded validation

#### Learning material

**Concepts**

A deployment handover explains what was implemented, how it was verified, and what remains uncertain. Include the final topology, address and VLAN tables, configuration versions, acceptance results and recovery procedure. Record the environment and tool versions so a later operator can interpret command output. A demonstration or oral defense should connect each requirement to observed evidence rather than to a screenshot of a success label. The syllabus's penetration-test wording must be bounded by explicit permission and an isolated lab; this learning package uses authorized connectivity and segmentation checks, not attacks against public or campus systems. Remove secrets and personal device data from the submitted documentation. Distinguish a planned test, a test actually run and a test that passed. An unresolved issue should include its practical effect and next diagnostic step. Student completion is established through submitted work and instructor assessment, not by this seed package.

**Worked example**

The handover matrix contains a student-to-teaching-service flow expected to succeed and a student-to-management flow expected to fail. The report records the simulator endpoints, actual observations and any discrepancy. A blank result remains not run; it is never converted to passed because the design looked plausible.

**Practice and evidence**

Present the completed isolated-lab design and its acceptance matrix. Demonstrate one allowed and one denied flow, explain rollback, and identify one limitation. Submit the redacted handover package and the actual test log for instructor review.

**References**

- [Cisco Campus LAN and Wireless LAN Solution Design Guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html)
- [IETF RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/)

#### Activity

**Task and submission**

Present the completed isolated-lab design and its acceptance matrix. Demonstrate one allowed and one denied flow, explain rollback, and identify one limitation. Submit the redacted handover package and the actual test log for instructor review.

**Procedure**

1. State the inputs, scope and expected result before starting.
2. Perform the task in the specified exercise environment.
3. Compare actual observations with the expectation.
4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.

**Instructor review criteria**

1. Each claimed result has observed evidence
2. Permission and isolation boundaries are explicit
3. Unrun or failed tests retain their actual status

#### Readiness check and instructor answer key

1. How should a test without an actual observation be recorded?

   A. Passed
   B. Not run
   C. Perfect score
   D. Officially approved

   **Draft key: B.** A test that has not been observed must remain not run.

2. What authorizes a network validation target?

   A. A plausible address
   B. The presence of a web page
   C. Explicit permission and the agreed scope
   D. A course title alone

   **Draft key: C.** Testing must stay within explicitly authorized targets and scope.

3. What substantiates a handover claim?

   A. A requirement linked to recorded test evidence
   B. A success toast alone
   C. An invented completion time
   D. An unreviewed seed score

   **Draft key: A.** A requirement linked to an actual recorded test provides evidence for the handover claim.
