# SASS Setup Guide (KMK(T) Portal)

## Hali ya sasa
- Project ya sasa ni HTML/CSS/JS modular (non-React build).
- Nimeongeza **Sass source structure** ili style system iwe scalable.
- CSS ya production inaendelea kufanya kazi kama kawaida.

## Sass files zilizoongezwa
- `styles-sass/_variables.scss`
- `styles-sass/_mixins.scss`
- `styles-sass/phase33-dynamic-signup.scss`

## Compile example (ukiamua kutumia Node)
```bash
npm init -y
npm install -D sass
npx sass styles-sass/phase33-dynamic-signup.scss phase33-dynamic-signup.css --watch
```

## Recommended migration strategy
1. Keep existing `.css` files for stability.
2. Migrate module by module to `.scss`.
3. Compile to same output CSS filename to avoid HTML breakage.
4. Later move to React + Tailwind + shadcn in separate branch/repo bootstrap.

## Note
Kwa requirement yako ya React+TypeScript+Tailwind+shadcn+Framer, inahitaji scaffold mpya (Vite/Next) badala ya kubandika juu ya static-only structure ya sasa.
