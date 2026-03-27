# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "Prihlásenie" [level=1] [ref=e5]
        - paragraph [ref=e6]: Prihlás sa do Realitka AI dashboardu.
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]: Email
          - textbox [ref=e10]
        - generic [ref=e11]:
          - generic [ref=e12]: Heslo
          - textbox [ref=e13]
        - button "Prihlásiť sa" [ref=e14]
      - paragraph [ref=e15]:
        - text: Ešte nemáš účet?
        - link "Zaregistruj sa" [ref=e16] [cursor=pointer]:
          - /url: /register
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - img [ref=e23]
  - alert [ref=e26]
```