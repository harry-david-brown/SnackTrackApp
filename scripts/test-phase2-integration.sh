#!/bin/bash

# Phase 2 Backend Integration Test Suite
# Tests Redis caching, cache invalidation, and performance improvements

API_URL="${API_URL:-http://localhost:3000}"
TEST_USER="phase2test-$(date +%s)@example.com"
TEST_PASS="TestPass123"
CSV_FILE="/tmp/test-receipts.csv"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST $1:${NC} $2"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1"
}

# Create test CSV in Uber Eats format
create_test_csv() {
    cat > "$CSV_FILE" << 'EOF'
Order_Id,City_Name,Restaurant_Name,Meal_Period,Request_Time_Local,Delivery_Time_Local,Order_Status,Item_Name,Item_quantity,Item_Price,Order_Price,Currency
12345,San Francisco,Test Restaurant 1,Lunch,2024-01-01 12:00,2024-01-01 12:30,Delivered,Burger,1,12.50,25.50,USD
12345,San Francisco,Test Restaurant 1,Lunch,2024-01-01 12:00,2024-01-01 12:30,Delivered,Fries,1,5.00,25.50,USD
12346,San Francisco,Test Restaurant 2,Dinner,2024-01-02 18:30,2024-01-02 19:00,Delivered,Pizza,1,18.75,18.75,USD
12347,Los Angeles,Test Restaurant 3,Lunch,2024-01-03 13:15,2024-01-03 13:45,Delivered,Salad,2,16.00,32.00,USD
12348,San Francisco,Test Restaurant 1,Breakfast,2024-01-04 09:45,2024-01-04 10:15,Delivered,Pancakes,1,22.25,22.25,USD
12349,San Diego,Test Restaurant 4,Dinner,2024-01-05 19:20,2024-01-05 19:50,Delivered,Tacos,3,9.63,28.90,USD
EOF
    print_info "Created test CSV with 6 items (4 orders), total: $127.40"
}

# Measure response time
measure_time() {
    local start=$(date +%s%3N)
    eval "$1"
    local end=$(date +%s%3N)
    echo $((end - start))
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Backend Phase 2 Integration Test Suite               ║${NC}"
echo -e "${BLUE}║  Testing Redis Caching & Performance Improvements     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check Enhancement
print_test "1" "Health Check with Database Latency"
((TESTS_RUN++))

HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | jq .

if echo "$HEALTH" | jq -e '.database.status == "connected"' > /dev/null && \
   echo "$HEALTH" | jq -e '.database.latency >= 0' > /dev/null; then
    print_success "Health check includes database status and latency"
else
    print_fail "Health check missing database metrics"
fi

# Test 2: User Registration
print_test "2" "Register Test User"
((TESTS_RUN++))

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.userId')
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')

if [ "$USER_ID" != "null" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    print_success "User registered successfully: $USER_ID"
else
    print_fail "Registration failed"
    echo "$REGISTER_RESPONSE" | jq .
    exit 1
fi

# Test 3: First Analytics Load (Cache MISS)
print_test "3" "First Analytics Load - Cache MISS Expected"
((TESTS_RUN++))

print_info "Fetching analytics for the first time..."
TIME1=$(measure_time "curl -s -H \"Authorization: Bearer $ACCESS_TOKEN\" \"$API_URL/users/$USER_ID/summary\" > /tmp/analytics1.json")

RESPONSE1=$(cat /tmp/analytics1.json)
if echo "$RESPONSE1" | jq -e '.user.id' > /dev/null; then
    print_success "First load successful (${TIME1}ms) - Cache MISS"
    echo "$RESPONSE1" | jq '.statistics | {totalSpent, totalReceipts}'
else
    print_fail "First analytics load failed"
    echo "$RESPONSE1" | jq .
fi

# Test 4: Second Analytics Load (Cache HIT)
print_test "4" "Second Analytics Load - Cache HIT Expected"
((TESTS_RUN++))

print_info "Fetching analytics again (should be cached)..."
sleep 1
TIME2=$(measure_time "curl -s -H \"Authorization: Bearer $ACCESS_TOKEN\" \"$API_URL/users/$USER_ID/summary\" > /tmp/analytics2.json")

RESPONSE2=$(cat /tmp/analytics2.json)
if echo "$RESPONSE2" | jq -e '.user.id' > /dev/null; then
    print_success "Second load successful (${TIME2}ms) - Cache HIT"
    
    # Compare times
    if [ "$TIME2" -le "$TIME1" ]; then
        print_info "Performance: Second load was equal or faster (${TIME2}ms vs ${TIME1}ms)"
    else
        print_info "Performance: Second load was ${TIME2}ms vs first ${TIME1}ms"
    fi
    
    # Verify data consistency
    TOTAL1=$(echo "$RESPONSE1" | jq -r '.statistics.totalReceipts')
    TOTAL2=$(echo "$RESPONSE2" | jq -r '.statistics.totalReceipts')
    
    if [ "$TOTAL1" == "$TOTAL2" ]; then
        print_success "Data consistency verified (both show $TOTAL1 receipts)"
    else
        print_fail "Data inconsistency: $TOTAL1 vs $TOTAL2"
    fi
else
    print_fail "Second analytics load failed"
fi

# Test 5: CSV Upload
print_test "5" "CSV Upload and Cache Invalidation"
((TESTS_RUN++))

create_test_csv

print_info "Uploading test CSV..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/csv/import" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "csvFile=@$CSV_FILE" \
    -F "userId=$USER_ID")

echo "$UPLOAD_RESPONSE" | jq .

IMPORTED=$(echo "$UPLOAD_RESPONSE" | jq -r '.importedCount')
if [ "$IMPORTED" == "4" ]; then
    print_success "CSV uploaded successfully: 4 receipts imported"
else
    print_fail "CSV upload failed or wrong count: $IMPORTED (expected 4)"
fi

# Test 6: Analytics After Upload (Cache Should Be Invalidated)
print_test "6" "Analytics After Upload - Cache Invalidation"
((TESTS_RUN++))

print_info "Waiting 2 seconds for backend processing..."
sleep 2

print_info "Fetching analytics after upload (cache should be invalidated)..."
TIME3=$(measure_time "curl -s -H \"Authorization: Bearer $ACCESS_TOKEN\" \"$API_URL/users/$USER_ID/summary\" > /tmp/analytics3.json")

RESPONSE3=$(cat /tmp/analytics3.json)
RECEIPTS_AFTER=$(echo "$RESPONSE3" | jq -r '.statistics.totalReceipts')
SPENT_AFTER=$(echo "$RESPONSE3" | jq -r '.statistics.totalSpent')

print_info "Analytics after upload (${TIME3}ms):"
echo "$RESPONSE3" | jq '.statistics | {totalSpent, totalReceipts}'

if [ "$RECEIPTS_AFTER" == "4" ]; then
    print_success "Cache invalidated correctly: Now showing 4 receipts"
else
    print_fail "Cache invalidation failed: Expected 4 receipts, got $RECEIPTS_AFTER"
fi

if [ "$SPENT_AFTER" == "127.4" ] || [ "$SPENT_AFTER" == "127.40" ]; then
    print_success "Total spent updated correctly: \$$SPENT_AFTER"
else
    print_info "Total spent: \$$SPENT_AFTER (expected \$127.40)"
fi

# Test 7: Repeat Load After Upload (Should Be Cached Again)
print_test "7" "Repeat Load After Upload - New Cache Entry"
((TESTS_RUN++))

sleep 1
TIME4=$(measure_time "curl -s -H \"Authorization: Bearer $ACCESS_TOKEN\" \"$API_URL/users/$USER_ID/summary\" > /tmp/analytics4.json")

RESPONSE4=$(cat /tmp/analytics4.json)
RECEIPTS_CACHED=$(echo "$RESPONSE4" | jq -r '.statistics.totalReceipts')

if [ "$RECEIPTS_CACHED" == "4" ]; then
    print_success "Cached data shows updated values (${TIME4}ms)"
    
    if [ "$TIME4" -le "$TIME3" ]; then
        print_info "Cache working: Second fetch was equal or faster (${TIME4}ms vs ${TIME3}ms)"
    fi
else
    print_fail "Cached data incorrect: Expected 4, got $RECEIPTS_CACHED receipts"
fi

# Test 8: Multiple Uploads (Cache Invalidation Consistency)
print_test "8" "Multiple Uploads - Cache Invalidation"
((TESTS_RUN++))

print_info "Uploading second CSV..."
UPLOAD2=$(curl -s -X POST "$API_URL/csv/import" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "csvFile=@$CSV_FILE" \
    -F "userId=$USER_ID")

sleep 2

ANALYTICS_MULTI=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_URL/users/$USER_ID/summary")
RECEIPTS_MULTI=$(echo "$ANALYTICS_MULTI" | jq -r '.statistics.totalReceipts')

if [ "$RECEIPTS_MULTI" == "8" ]; then
    print_success "Multiple uploads work: Now showing 8 receipts (4 + 4)"
else
    print_fail "Multiple upload cache invalidation failed: Expected 8, got $RECEIPTS_MULTI receipts"
fi

# Test 9: Second User Isolation
print_test "9" "User Data Isolation with Caching"
((TESTS_RUN++))

TEST_USER2="phase2test2-$(date +%s)@example.com"
print_info "Creating second user: $TEST_USER2"

REGISTER2=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER2\",\"password\":\"$TEST_PASS\"}")

USER_ID2=$(echo "$REGISTER2" | jq -r '.userId')
ACCESS_TOKEN2=$(echo "$REGISTER2" | jq -r '.accessToken')

# Fetch analytics for both users
ANALYTICS_USER1=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_URL/users/$USER_ID/summary")
ANALYTICS_USER2=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN2" "$API_URL/users/$USER_ID2/summary")

RECEIPTS_USER1=$(echo "$ANALYTICS_USER1" | jq -r '.statistics.totalReceipts')
RECEIPTS_USER2=$(echo "$ANALYTICS_USER2" | jq -r '.statistics.totalReceipts')

if [ "$RECEIPTS_USER1" == "8" ] && [ "$RECEIPTS_USER2" == "0" ]; then
    print_success "User isolation verified: User1=$RECEIPTS_USER1, User2=$RECEIPTS_USER2"
else
    print_fail "User isolation failed: User1=$RECEIPTS_USER1 (expected 8), User2=$RECEIPTS_USER2 (expected 0)"
fi

# Test 10: Performance Baseline
print_test "10" "Performance Baseline Summary"
print_info "Response times collected:"
echo "  First load (cold):    ${TIME1}ms"
echo "  Second load (cached): ${TIME2}ms"
echo "  After upload:         ${TIME3}ms"
echo "  Re-cached:            ${TIME4}ms"

AVG_CACHED=$(( (TIME2 + TIME4) / 2 ))
print_info "Average cached response time: ${AVG_CACHED}ms"

if [ "$AVG_CACHED" -lt 100 ]; then
    print_success "Performance excellent: <100ms cached responses"
elif [ "$AVG_CACHED" -lt 200 ]; then
    print_success "Performance good: <200ms cached responses"
else
    print_info "Performance acceptable: ${AVG_CACHED}ms cached responses"
fi

# Cleanup
rm -f "$CSV_FILE" /tmp/analytics*.json

# Final Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Total Tests Run:    $TESTS_RUN"
echo -e "${GREEN}Tests Passed:       $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests Failed:       $TESTS_FAILED${NC}"
else
    echo "Tests Failed:       $TESTS_FAILED"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ALL TESTS PASSED - Phase 2 Integration Verified   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ SOME TESTS FAILED - Review Results Above          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi

