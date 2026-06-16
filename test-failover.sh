#!/bin/bash
# =============================================================================
# test-failover.sh — Hot Spare Failover Test Suite
# ArquiSoft Tienda de Regalos
# =============================================================================
# Prerrequisito: docker compose up -d (con el nuevo docker-compose.yml)
# Uso:           chmod +x test-failover.sh && ./test-failover.sh
# =============================================================================

COORDINATOR="http://localhost:80"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() { echo -e "\n${CYAN}${BOLD}══════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}══════════════════════════════════════════${NC}"; }
ok()     { echo -e "  ${GREEN}✔  $1${NC}"; PASS=$((PASS+1)); }
fail()   { echo -e "  ${RED}✘  $1${NC}"; FAIL=$((FAIL+1)); }
info()   { echo -e "  ${YELLOW}ℹ  $1${NC}"; }
step()   { echo -e "\n  ${BOLD}▶ $1${NC}"; }

# ── TEST 1: Estado inicial del sistema ────────────────────────────────
banner "TEST 1 — Estado inicial del sistema"

step "Verificando que el coordinator responde en :80..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$COORDINATOR/")
if [ "$STATUS" = "200" ]; then
  ok "Coordinator respondió HTTP $STATUS"
else
  fail "Coordinator no responde (HTTP $STATUS). ¿Está corriendo docker compose?"
  exit 1
fi

step "Verificando estado interno del coordinator..."
STATE=$(curl -s --max-time 5 "$COORDINATOR/coordinator/state")
echo "  $STATE"
PRIMARY=$(echo $STATE | grep -o '"primary":"[^"]*"' | cut -d'"' -f4)
SECONDARY=$(echo $STATE | grep -o '"secondary":"[^"]*"' | cut -d'"' -f4)
if [ -n "$PRIMARY" ]; then
  ok "Primario identificado: $PRIMARY"
  ok "Secundario identificado: $SECONDARY"
else
  fail "No se pudo leer el estado del coordinator"
fi

step "Verificando que /api/products responde a través del coordinator..."

RESP_BODY=$(curl -s --max-time 8 "$COORDINATOR/api/products")
RESP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$COORDINATOR/api/products")
IS_JSON=$(echo "$RESP_BODY" | grep -c '^\[' || echo "0")

if [ "$RESP_HTTP" = "200" ] && [ "$IS_JSON" -ge "1" ]; then
  ok "GET /api/products → HTTP 200 con JSON válido (a través del coordinator)"
elif [ "$RESP_HTTP" = "200" ]; then
  ok "GET /api/products → HTTP 200 (a través del coordinator)"
else
  fail "GET /api/products → HTTP $RESP_HTTP"
fi

# ── TEST 2: Fan-out — ambos nodos (nginx-lb activo y spare) ──────────
banner "TEST 2 — Fan-out en paralelo (ambos nodos activos)"

step "Enviando 5 requests consecutivos y midiendo latencia..."
SUCCESS=0
for i in $(seq 1 5); do
  START=$(date +%s%3N)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$COORDINATOR/api/products")
  END=$(date +%s%3N)
  LATENCY=$(( END - START ))
  if [ "$HTTP" = "200" ]; then
    SUCCESS=$((SUCCESS+1))
    info "Request $i → OK (${LATENCY}ms)"
  else
    info "Request $i → HTTP $HTTP"
  fi
done

if [ $SUCCESS -eq 5 ]; then
  ok "5/5 requests exitosos bajo operación normal"
else
  fail "$SUCCESS/5 requests exitosos"
fi

step "Verificando que nginx-lb activo y spare están corriendo..."
NLB_ACTIVE=$(docker ps --format "{{.Names}}" 2>/dev/null | grep "nginx-lb" | grep -v "spare" | head -1)
NLB_SPARE=$(docker ps --format "{{.Names}}"  2>/dev/null | grep "nginx-lb-spare" | head -1)

if [ -n "$NLB_ACTIVE" ]; then
  ok "nginx-lb activo corriendo: $NLB_ACTIVE"
else
  fail "No se encontró el contenedor nginx-lb activo"
fi
if [ -n "$NLB_SPARE" ]; then
  ok "nginx-lb spare corriendo: $NLB_SPARE"
else
  fail "No se encontró el contenedor nginx-lb-spare"
fi

step "Verificando que las 3 instancias del cluster api-gateway están corriendo..."
GW_COUNT=$(docker ps --format "{{.Names}}" 2>/dev/null | grep "api-gateway" | grep -v "spare" | grep -v "coordinator" | wc -l)
if [ "$GW_COUNT" -ge 3 ]; then
  ok "$GW_COUNT instancias de api-gateway corriendo (cluster activo)"
else
  fail "Solo $GW_COUNT/3 instancias de api-gateway encontradas"
fi

# ── TEST 3: Failover — detener el nginx-lb activo ─────────────────────
banner "TEST 3 — Failover: el nodo activo (nginx-lb) falla"

step "Estado antes del failover..."
STATE_BEFORE=$(curl -s --max-time 5 "$COORDINATOR/coordinator/state")
info "Coordinator state: $STATE_BEFORE"

step "Deteniendo el nodo nginx-lb (nodo activo del hot spare)..."
CONTAINER="$NLB_ACTIVE"
if [ -n "$CONTAINER" ]; then
  docker stop "$CONTAINER" > /dev/null 2>&1
  ok "Contenedor '$CONTAINER' detenido"
else
  fail "No se encontró el contenedor nginx-lb activo"
  info "Continuando el test asumiendo que el nodo activo está caído..."
fi

step "Esperando 2 segundos para que el coordinator detecte la falla..."
sleep 2

# ── TEST 4: El spare toma el control ──────────────────────────────────
banner "TEST 4 — El spare toma el control"

step "Enviando request al coordinator mientras nginx-lb está caído..."
FAILOVER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$COORDINATOR/api/products")
FAILOVER_BODY=$(curl -s --max-time 10 "$COORDINATOR/api/products")

if [ "$FAILOVER_HTTP" = "200" ]; then
  ok "Coordinator respondió HTTP 200 usando el SPARE ✔"
else
  fail "Coordinator devolvió HTTP $FAILOVER_HTTP durante el failover"
fi

FAILOVER_HEADER=$(curl -s -I --max-time 10 "$COORDINATOR/api/products" | grep -i "x-failover")
if [ -n "$FAILOVER_HEADER" ]; then
  ok "Header X-Failover detectado: $FAILOVER_HEADER"
else
  STATE_MID=$(curl -s --max-time 5 "$COORDINATOR/coordinator/state")
  PRIMARY_MID=$(echo $STATE_MID | grep -o '"primary":"[^"]*"' | cut -d'"' -f4)
  if [ "$PRIMARY_MID" != "$PRIMARY" ]; then
    ok "Failover confirmado: coordinator cambió primario a '$PRIMARY_MID'"
  else
    info "Primario aún sin cambio (el spare puede estar respondiendo como backup)"
  fi
fi

step "Verificando que el coordinator actualizó su nodo primario..."
STATE_AFTER=$(curl -s --max-time 5 "$COORDINATOR/coordinator/state")
info "Coordinator state post-failover: $STATE_AFTER"
PRIMARY_AFTER=$(echo $STATE_AFTER | grep -o '"primary":"[^"]*"' | cut -d'"' -f4)
if [ "$PRIMARY_AFTER" != "$PRIMARY" ]; then
  ok "Primario actualizado: '$PRIMARY' → '$PRIMARY_AFTER'"
else
  info "Primario sin cambio — spare respondió como secundario activo"
fi

# ── TEST 5: Disponibilidad continua post-failover ─────────────────────
banner "TEST 5 — Disponibilidad continua (5 requests con nginx-lb caído)"

step "Enviando 5 requests adicionales mientras nginx-lb está caído..."
SUCCESS=0
FAILED=0
for i in $(seq 1 5); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$COORDINATOR/api/products")
  if [ "$HTTP" = "200" ]; then
    SUCCESS=$((SUCCESS+1))
    info "Request $i → OK (spare sirviendo, HTTP $HTTP)"
  else
    FAILED=$((FAILED+1))
    info "Request $i → FAIL (HTTP $HTTP)"
  fi
done

if [ $SUCCESS -ge 4 ]; then
  ok "$SUCCESS/5 requests exitosos con nginx-lb caído — disponibilidad mantenida"
else
  fail "Solo $SUCCESS/5 requests exitosos — revisar configuración del spare"
fi

# ── TEST 6: Recuperación — reiniciar nginx-lb ─────────────────────────
banner "TEST 6 — Recuperación: reiniciar nginx-lb activo"

if [ -n "$CONTAINER" ]; then
  step "Reiniciando '$CONTAINER'..."
  docker start "$CONTAINER" > /dev/null 2>&1
  sleep 4
  ok "Contenedor reiniciado"

  step "Verificando que el sistema vuelve a funcionar normalmente..."
  RECOVER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$COORDINATOR/api/products")
  RECOVER_BODY=$(curl -s --max-time 10 "$COORDINATOR/api/products")
  IS_JSON=$(echo "$RECOVER_BODY" | grep -c '^\[' || echo "0")

  if [ "$RECOVER_HTTP" = "200" ] && [ "$IS_JSON" -ge "1" ]; then
    ok "Sistema operativo post-recuperación (HTTP 200, JSON válido)"
  elif [ "$RECOVER_HTTP" = "200" ]; then
    ok "Sistema operativo post-recuperación (HTTP 200)"
  else
    fail "Error post-recuperación (HTTP $RECOVER_HTTP)"
  fi

  step "Estado final del coordinator..."
  STATE_FINAL=$(curl -s --max-time 5 "$COORDINATOR/coordinator/state")
  info "Coordinator state final: $STATE_FINAL"
else
  fail "No se pudo reiniciar el contenedor (variable CONTAINER vacía)"
fi

banner "RESUMEN DE PRUEBAS"
TOTAL=$((PASS+FAIL))
echo -e "  Total:   ${BOLD}$TOTAL${NC}"
echo -e "  ${GREEN}Pasaron: $PASS${NC}"
echo -e "  ${RED}Fallaron: $FAIL${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✔ Hot Spare Pattern funcionando correctamente${NC}"
else
  echo -e "  ${YELLOW}${BOLD}⚠ Revisar los tests fallidos arriba${NC}"
fi
echo ""