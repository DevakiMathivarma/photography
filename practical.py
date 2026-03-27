"""1)printing even numbers from 1 to 100"""
for i in range(0,101):
    if i % 2 == 0:
        print(i)

for i in range(2,101,2):
    print(i)

"""2)Write a program to print the reverse of a number."""
a = "1234"
revers_num = ""
for i in a:
    revers_num = i + revers_num
print(revers_num)
print(type(revers_num))
"""Iteration 1 → i = "1"
reverse_num = "1" + "" → "1"

Iteration 2 → i = "2"
reverse_num = "2" + "1" → "21"

Iteration 3 → i = "3"
reverse_num = "3" + "21" → "321"

Iteration 4 → i = "4"
reverse_num = "4" + "321" → "4321"""
# negative indexing

b = "1234"
print(b[-1])
print(b[1])
print(b[1:])
print(type(b))

# with list
a = 5678
num_num  = []
while a > 0:
    digit = a % 10
    num_num.append(digit)
    a = a // 10 
print(num_num)
print(type(num_num))

# with numbers
a1 = 5678
reversing_num = 0

while a1 > 0 :
    digit = a1 % 10
    reversing_num = reversing_num*10 + digit
    a1 = a1 // 10 
print(reversing_num)
print(type(reversing_num))

# =============================================================================================================================

""" 5)Write a program to find the sum of digits of a number."""
number  = 1234
sum_digits =  0
while number >0:
    digit = number % 10
    """or sum_digits = sum_digits+digit"""
    sum_digits += digit   
    number = number // 10
print(sum_digits)

# with list of numbers
num_list = [1,2,3,4,5]
new_list = 0
for i in num_list:
    new_list += i
print(new_list)
# =======================================================================

"""6. Write a program to find the largest of three numbers."""

ag = 99
bg= 60
cg= 100
 
if ag >= bg and ag >= cg:
    print(f"{ag} is gretest")
elif bg >=ag and bg >= cg:
    print(f"{bg} is gretest")
else:
    print(f"{cg} is gretest")

print(max(ag,bg,cg))

h = [10,20,100,30,50]
large_num = h[0]
for i in h:
    if i > large_num:
        large_num = i

print(f"largest number is {large_num}")

"""Thinking Pattern (Important for Beginners)

Whenever you need the largest value in a list:

Assume the first element is largest

Loop through the list

Compare each element

Update the largest value if needed"""
# -------------------------------------------------------------------------------------
"""7. Write a program to check if a number is palindrome."""

"""A palindrome is something that remains the same when reversed."""

pal = 1234
original = pal
reverse_pal = 0

while pal > 0:
    digit =  pal % 10
    reverse_pal = reverse_pal*10 + digit 
    pal = pal // 10
if pal == reverse_pal:
    print(f"{original}is a palindrome")
else:
    print(f"{original}is not  a palindrome")


palindrome_string = "madam"
original_pal = palindrome_string
pal_empty = ""

for i in palindrome_string:
    pal_empty = i + pal_empty
print(pal_empty)
if original_pal == pal_empty:
    print(f"{original_pal} is a palindrome")
else:
    print(f"{original_pal} is not  a palindrome")

# =====================================================================================================
"""8. Write a program to count the number of vowels in a string."""

name = "devaki"
count = 0
for i in name:
    if i in ("a","e","i","o","u"):
        count+=1
print(count)

"""9. Write a program to count words in a string."""

"""split() is a string method that divides a string into a list of substrings based on a specified separator (default is whitespace)."""
words = ["i","am","devaki"]
counts = 0
for i in words:
    counts +=1
print(counts)

word = "i am devaki a python full stack developer"
countss = 0
for i in word.split():
    countss += 1
print(countss)

a = 10
b = 15
temp =  a
print("temp:",temp)
a = b
print("a:" ,a)
print("b:", b)
b = temp
print("b:" ,b)
print(a,b)


# ======================
"""printing prime number """

prime_num = 10
if prime_num <= 1:
    print("it is not a prime number")
else:
    is_prime = True
    for i in range(2,int(prime_num**0.5)+1):
        if prime_num % 2 == 0:
            is_prime = False
            break
    if(is_prime):
        print("it is a prime number")
    else:
        print("not a prime number")

# if it is list of numbers
prime_number = [10,11,12,13,14,15,16,17,18,19,20]
for i in prime_number:
    if i <= 1:
        print("it is not a prime number")
        continue
    is_prime = True
    for j in range(2,int(i**0.5)+1):
        if i % 2 == 0:
            is_prime = False
            break
    if(is_prime):
        print(i)

# if it is printing number from 1 to 100

empty_prime = []
for i in range(2,101):
    if i <= 1:
        print("it is not a prime number")
        continue
    is_prime = True
    for j in range(2,int(i**0.5)+1):
        if i % 2 == 0:
            is_prime = False
            break
    if(is_prime):
        empty_prime.append(i)
print(empty_prime)


# palidrome
pal = 1234
original = pal
reverse_palinrome = 0
while pal > 0:
    digit = pal % 10
    reverse_palinrome = reverse_palinrome*10 + digit
    pal =  pal// 10
if original == reverse_palinrome:
    print("it is palindrome ")
else:
    print("it is not a palindrome")