# NoteUI

Frontend for note.initedit

### Run with docker-compose

```bash
NOTE_API_BACKEND=http://192.168.0.114:8000/api/ docker compose up -d
```

## Run with docker

```bash
docker run -d -p 80:80 -e NOTE_API_BACKEND='https://api.note.initedit.com/api/' initedit/note.initedit
```

## build docker image

```bash
docker build -t note.initedit -e NOTE_API_BACKEND='https://api.note.initedit.com/api/'

#run
docker run -d -p 80:80 -e NOTE_API_BACKEND='https://api.note.initedit.com/api/' note.initedit

```

## Development server

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.0.8.

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
