## Schema of Variable Definitions

`v0_var_definitions.json` stores the definition of variables, which is by default empty.
Variables can be added using the frontend, or by directly editing this json file.
To directly edit, follow this schema:

```
{
    "var_name": "xxx"
    "definition": "xxx"
    "factor_type": "social" or "ecological",
}
```

Here's an example variable of driver:

```
"driver": [
    {
        "var_name": "交通運輸"
        "definition": "包括航運、海事活動、航運產業、船舶交通、商用船隻、高運輸成本和運輸實踐。",
        "factor_type": "social",
    },
]
```
