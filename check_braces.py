
def check_braces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{':
                stack.append((i + 1, j + 1))
            elif char == '}':
                if not stack:
                    print(f"Extra closing brace at line {i + 1}, col {j + 1}")
                    return
                stack.pop()

    if stack:
        print(f"Unclosed brace at line {stack[-1][0]}, col {stack[-1][1]}")
        print(f"Total unclosed braces: {len(stack)}")
        for item in stack:
             print(f"Unclosed at Line: {item[0]}")
    else:
        print("Braces are balanced.")

check_braces('c:\\Users\\eidan\\OneDrive\\Escritorio\\Bodega-Project-2-main\\style.css')
