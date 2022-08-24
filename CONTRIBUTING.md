# Contributing

Thanks for being willing to contribute!

**Working on your first Pull Request?** You can learn how from this _free_ series
[How to Contribute to an Open Source Project on GitHub][egghead]

## Project setup

1. Fork and clone the repo
2. `$ npm install` to install dependencies
3. `$ npm start validate` to validate you've got it working
4. Create a branch for your PR

This project uses [`nps`][nps] and you can run `npm start help` to see what
scripts are available.

> Tip: Keep your `master` branch pointing at the original repository and make
> pull requests from branches on your fork. To do this, run:
>
> ```
> git remote add upstream https://github.com/prettier/prettier-eslint-cli.git
> git fetch upstream
> git branch --set-upstream-to=upstream/master master
> ```
>
> This will add the original repository as a "remote" called "upstream,"
> Then fetch the git information from that remote, then set your local `master`
> branch to use the upstream master branch whenever you run `git pull`.
> Then you can make all of your pull request branches based on this `master`
> branch. Whenever you want to update your version of `master`, do a regular
> `git pull`.

## Add yourself as a contributor

This project follows the [all contributors][all-contributors] specification.
To add yourself to the table of contributors on the README.md, please use the
automated script as part of your PR:

```console
npm start contributors.add
```

Follow the prompt and commit `.all-contributorsrc` and `README.md` in the PR.
If you've already added yourself to the list and are making
a new type of contribution, you can run it again and select the added
contribution type.

## Committing and Pushing changes

This project uses [`changesets`][changesets] to do automatic
releases and generate a changelog based on the changeset files. We follow
[a convention][convention] for commit messages. You don't have to follow this
convention if you don't like to. Just know that when we merge your commit, we'll
probably use "Squash and Merge" so we can change the commit message :)

Please make sure to run the tests before you commit your changes. You can run
`npm start test.update` which will update any snapshots that need updating.
Make sure to include those changes (if they exist) in your commit.

You or a maintainer will need to add a changeset file on you pull request if we
want to draft a new release for your PR. If there are changeset files on the
master branch, [`changeset-bot`][changeset-bot] will raise a PR for releasing
automatically. When the release is finally ready, we will only need to merge
that PR.

### simple-git-hooks

There are git hooks set up with this project that are automatically installed
when you install dependencies.

## Help needed

Please checkout the [the open issues][issues]

Also, please watch the repo and respond to questions/bug reports/feature requests! Thanks!

[egghead]: https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github
[changesets]: https://github.com/changesets/changesets
[changeset-bot]: https://github.com/apps/changeset-bot
[convention]: https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional
[all-contributors]: https://github.com/kentcdodds/all-contributors
[issues]: https://github.com/prettier/prettier-eslint-cli/issues
[nps]: https://github.com/kentcdodds/nps
