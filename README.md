# DOS-Style Portfolio Manager

Портфолио на Go с DOS-подобным интерфейсом.

## Структура проекта

- `cmd/server/` - HTTP сервер с API и встроенным cronjob
- `internal/` - Бизнес-логика
- `web/public/` - Frontend

## Установка зависимостей

```bash
go mod download
```

## Запуск

### Основной сервер (с автоматической синхронизацией)
```bash
go run cmd/server/main.go
```

Доступен на http://localhost:8080

Cronjob будет автоматически работать в фоне согласно интервалу из конфига.

## Переменные окружения

- `PORTFOLIO_PATH` - Путь к папке портфолио (default: ./portfolio)
- `REPO_URL` - URL репозитория (default: https://github.com/webbsalad/3-course)
- `SYNC_INTERVAL_MINUTES` - Интервал синхронизации в минутах (default: 60)

## API

### GET /api/structure
Возвращает JSON структуру всех файлов и папок

### GET /api/file?path=<path>
Возвращает содержимое файла

## Команды в интерфейсе

- `dir` / `ls` - Список файлов
- `cd <path>` - Перейти в папку
- `cat ` / `type ` - Просмотр файла
- `cls` / `clear` - Очистить экран
- `help` - Справка
