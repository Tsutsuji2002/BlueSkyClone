
import os

filepath = r'c:\Projects\BlueSky\backend\Services\UserService.cs'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

open_braces = 0
for i, line in enumerate(lines):
    line_num = i + 1
    # Very simple count, ignore characters in strings/comments for accuracy
    in_string = False
    in_single_line_comment = False
    in_multi_line_comment = False
    
    for j, char in enumerate(line):
        if in_single_line_comment:
            break
        if in_multi_line_comment:
            if char == '*' and j + 1 < len(line) and line[j+1] == '/':
                in_multi_line_comment = False
            continue
            
        if char == '"' and (j == 0 or line[j-1] != '\\'):
            in_string = not in_string
            continue
            
        if in_string:
            continue
            
        if char == '/' and j + 1 < len(line):
            if line[j+1] == '/':
                in_single_line_comment = True
                break
            if line[j+1] == '*':
                in_multi_line_comment = True
                continue
                
        if char == '{':
            open_braces += 1
        elif char == '}':
            open_braces -= 1
            if open_braces < 0:
                print(f"ERROR: Negative brace count at line {line_num}: {line.strip()}")
                break
    if open_braces < 0:
        break
    if open_braces == 0 and i > 25: # Assuming class starts after line 25
        # Find first non-empty line
        print(f"INFO: Brace count reached zero at line {line_num}: {line.strip()}")
        # Check if this is the end of the file
        if i < len(lines) - 5:
            print(f"WARNING: Class closed early at line {line_num}!")

print(f"FINAL Brace count: {open_braces}")
