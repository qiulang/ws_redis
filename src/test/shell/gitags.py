#! /usr/bin/env python3
from subprocess import PIPE, run
import pathlib
import sys
from datetime import datetime
from termcolor import colored, cprint

tag_commands = ('git --no-pager tag -l "[v]4.*"', # "git --no-pager tag",
                'git rev-list -1',
                'git tag -d',
                'git push --delete origin')

def get_tags(todel=False):
    command = tag_commands[0]
    result = run(command, shell=True, stdout=PIPE, stderr=PIPE)
    #result = run(command.split(), stdout=PIPE, stderr=PIPE)
    output = result.stdout.decode('utf-8').strip() #trim
    if not output:
        print(colored(f"{command} failed",'red'))
        return
    for i in output.split('\n'):
        command = f"{tag_commands[1]} {i}"
        result = run(command.split(), stdout=PIPE, stderr=PIPE)
        output = result.stdout.decode('utf-8')[:7]
        print(f"{i} -> {output}")
        if todel == False:
            continue
        command = f"{tag_commands[2]} {i}"
        result = run(command.split(), stdout=PIPE, stderr=PIPE)
        output = result.stdout.decode('utf-8')
        if 'Deleted' not in output:
            print(colored(f"Delete tag {i} failed, but how come!","yellow"))
            continue
        command = f"{tag_commands[3]} {i}"
        result = run(command.split(), stdout=PIPE, stderr=PIPE)
        output = result.stderr.decode('utf-8')
        #result.stdout is just empty ''
        if 'deleted' not in output:
            print(colored(f"Delete tag {i} at remote server failed, but how come!","yellow"))
            continue

get_tags(todel=True)