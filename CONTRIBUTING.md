# How to Contribute

I'm thrilled you're considering making a contribution to my project! The process is straightforward, and I've outlined the steps below.

1. **Fork the Repository**: To start, click the "Fork" button at the top of the repository page.

2. **Clone the Repository**: In your new fork, click the "Code" button and copy the URL. Then, open your terminal and run the command `git clone [URL]`.

3. **Create a New Branch**: Navigate to the project directory by running `cd [project-name]` in your terminal. Switch to the `develop` branch with `git checkout develop` and create a new branch by running `git checkout -b [branch-name]`.

4. **Make Your Changes**: Now's the time to contribute your changes to the project. Once you're finished, add your changes with `git add .`.

5. **Do Not Update the Plugin Version**: Please refrain from manually updating the plugin's version. I utilize GitHub Actions to automatically update the version in the following files: manifest.json, package.json, versions.json, package-lock.json, and CHANGELOG.md.

6. **Commit Your Changes**: Commit your changes with `git commit -m "[commit-message]"`.

7. **Commit Message Guidelines**: We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for our commit messages. Here are the basic rules:
    - Commits must be prefixed with a type, which consists of a noun, feat, fix, etc., followed by a colon and a space.
    - The type `feat` should be used when a new feature is added.
    - The type `fix` should be used when a bug is fixed.
    - Use `docs` for documentation changes.
    - Use `style` for formatting changes that do not affect the code's meaning.
    - Use `refactor` when code is changed without adding features or fixing bugs.
    - Use `perf` for code changes that improve performance.
    - Use `test` when adding missing tests or correcting existing tests.
    - The type may be followed by a scope (optional).
    - A description must immediately follow the space after the type/scope prefix.
    - The description is a short description of the code changes, e.g., "Add new user registration module".
    - If needed, provide a longer description after the short description. Separate them by an empty line.

8. **Push Your Changes**: Push your changes to your fork on GitHub by running `git push origin [branch-name]`.

9. **Create a Pull Request**: Go back to your fork on GitHub, select your branch, and click "New pull request". Make sure the target branch for the pull request is `develop` in the original repository.

**Note**: Please ensure your code adheres to the project's standards. Commits that do not comply may be rejected.

Thank you for your interest in contributing to our project. Your effort and expertise help us continue to improve and grow.
