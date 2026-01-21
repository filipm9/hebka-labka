.PHONY: test test-backend test-frontend test-watch-backend test-watch-frontend install

# Run all tests in Docker (sequentially to avoid early abort)
test:
	@echo "\n\033[1;36m══════════════════════════════════════\033[0m"
	@echo "\033[1;36m  BACKEND TESTS\033[0m"
	@echo "\033[1;36m══════════════════════════════════════\033[0m\n"
	@docker compose -f docker-compose.test.yml build --quiet backend-test
	@docker compose -f docker-compose.test.yml up backend-test --abort-on-container-exit --exit-code-from backend-test 2>/dev/null | grep -v "Attaching\|Aborting\|Stopping\|Stopped\|exited with"
	@echo "\n\033[1;36m══════════════════════════════════════\033[0m"
	@echo "\033[1;36m  FRONTEND TESTS\033[0m"
	@echo "\033[1;36m══════════════════════════════════════\033[0m\n"
	@docker compose -f docker-compose.test.yml build --quiet frontend-test
	@docker compose -f docker-compose.test.yml up frontend-test --abort-on-container-exit --exit-code-from frontend-test 2>/dev/null | grep -v "Attaching\|Aborting\|Stopping\|Stopped\|exited with"
	@echo "\n\033[1;32m✓ All tests complete!\033[0m\n"

# Run only backend tests in Docker
test-backend:
	@docker compose -f docker-compose.test.yml build --quiet backend-test
	@docker compose -f docker-compose.test.yml up backend-test --abort-on-container-exit --exit-code-from backend-test 2>/dev/null | grep -v "Attaching\|Aborting\|Stopping\|Stopped\|exited with"

# Run only frontend tests in Docker
test-frontend:
	@docker compose -f docker-compose.test.yml build --quiet frontend-test
	@docker compose -f docker-compose.test.yml up frontend-test --abort-on-container-exit --exit-code-from frontend-test 2>/dev/null | grep -v "Attaching\|Aborting\|Stopping\|Stopped\|exited with"

# Run tests locally (requires npm install first)
test-local:
	cd backend && npm test
	cd frontend && npm test

# Watch mode for local development
test-watch-backend:
	cd backend && npm run test:watch

test-watch-frontend:
	cd frontend && npm run test:watch

# Install all dependencies locally
install:
	cd backend && npm install
	cd frontend && npm install

# Clean up test containers
test-clean:
	docker compose -f docker-compose.test.yml down --rmi local
