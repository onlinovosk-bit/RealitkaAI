# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "Prihlásenie" [level=1] [ref=e5]
        - paragraph [ref=e6]: Prihlás sa do Realitka AI dashboardu.
      - generic [ref=e7]: Invalid login credentials
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email
          - textbox [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: Heslo
          - textbox [ref=e14]
        - button "Prihlásiť sa" [ref=e15]
      - paragraph [ref=e16]:
        - text: Ešte nemáš účet?
        - link "Zaregistruj sa" [ref=e17] [cursor=pointer]:
          - /url: /register
  - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]:
    - img [ref=e24]
  - alert [ref=e27]
```