# Card artwork

Run `npm run cards:fetch` once to vendor the 52 faces and one card back from
[Letele's playing cards](https://github.com/letele/playing-cards), derived from
[Adrian Kennard's cards](https://www.me.uk/cards/). The upstream project dedicates
the artwork to the public domain under CC0 1.0. The script includes its LICENSE.

Commit the SVGs and license so Vercel serves them locally. The download is not a
build hook, and no browser request goes to GitHub. Until downloaded, the table
uses readable HTML/CSS rank-and-suit cards. No AI-generated images are used.
