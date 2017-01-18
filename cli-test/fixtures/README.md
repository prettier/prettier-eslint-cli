Because our CLI's goal is to overwrite files, we have to create the file during the test.
Then we overwrite it with the CLI, then we assert the contents, then we delete the file
(so we don't have issues with source control).