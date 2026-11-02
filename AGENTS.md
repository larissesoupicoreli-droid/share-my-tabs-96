<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Resolve purchase and installment responsibility through `src/lib/responsabilidade.ts` when replacing a split with a single person, so stale split rows cannot override the selected person.
- Responsibility-only purchase edits update installments in place to preserve payment status and existing invoice dates.
