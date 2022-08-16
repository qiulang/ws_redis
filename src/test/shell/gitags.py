#! /usr/bin/env python3
from subprocess import PIPE, run
from termcolor import colored
import argparse

tag_commands = ('git --no-pager tag',  # 'git --no-pager tag -l [v]3.*'
                'git rev-list -1',
                'git tag -d',
                'git push --delete origin')


def run_helper(command: str):
    result = run(command.split(), stdout=PIPE, stderr=PIPE)
    return result


def get_tags(todel=False) -> None:
    command = tag_commands[0]
    result = run_helper(command)
    output = result.stdout.decode('utf-8').strip()  # trim
    if not output:
        print(colored(f"{command} failed without any output", 'red'))
        return
    for i in output.split('\n'):
        command = f"{tag_commands[1]} {i}"
        result = run_helper(command)
        output = result.stdout.decode('utf-8')[:7]
        print(f"{i} -> {output}")
        if not todel:
            continue
        command = f"{tag_commands[2]} {i}"
        result = run_helper(command)
        output = result.stdout
        if b'Deleted' not in output:
            print(colored(f"Delete tag {i} failed, but how come!", "yellow"))
            continue
        command = f"{tag_commands[3]} {i}"
        result = run_helper(command)
        output = result.stderr.decode('utf-8')  # result.stdout is just empty ''
        if '[deleted]' not in output:
            print(colored(f"Delete tag {i} at remote server failed, but how come!", "yellow"))
            continue


def get_input() -> bool:
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", type=bool, default=False,
                        help="To delete tags or just list them")
    args = parser.parse_args()
    return args.d


def main():
    todel = get_input()
    get_tags(todel)


if __name__ == "__main__":
    main()
