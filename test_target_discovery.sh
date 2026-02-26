#!/bin/bash

# Base URL
BASE_URL="https://plugin-unify.preview.emergentagent.com/api"

# Test data
VALID_TOKEN="055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
VALID_ITEM_ID="c5c93c3e-b691-4bd5-a034-50ae9df8042d"

echo "🚀 STARTING TARGET DISCOVERY AND SAVE TARGET API TESTING"
echo "Testing against: $BASE_URL"

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "\n$(printf '=%.0s' {1..80})"
echo "TESTING: Save Target Endpoint - POST /api/onboarding/:token/items/:itemId/save-target"
echo "$(printf '=%.0s' {1..80})"

# Test 1: Missing selectedTarget (should return 400)
echo -e "\n[TEST 1/4] Testing missing selectedTarget..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' -w "\n%{http_code}" "$BASE_URL/onboarding/$VALID_TOKEN/items/$VALID_ITEM_ID/save-target")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "400" ]] && [[ "$BODY" =~ "selectedTarget is required" ]]; then
    echo "✅ PASS: Correctly rejected missing selectedTarget with 400"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 400 with 'selectedTarget is required', got $STATUS"
    echo "   Response: $BODY"
fi

# Test 2: Invalid token (should return 404)
echo -e "\n[TEST 2/4] Testing invalid token..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
INVALID_TOKEN="invalid-token-12345"
SAMPLE_TARGET='{"selectedTarget": {"externalId": "123456789", "displayName": "Test GA4 Property", "targetType": "PROPERTY", "parentExternalId": "accounts/123", "metadata": {"test": true}}}'
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$SAMPLE_TARGET" -w "\n%{http_code}" "$BASE_URL/onboarding/$INVALID_TOKEN/items/$VALID_ITEM_ID/save-target")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "404" ]] && [[ "$BODY" =~ "Invalid onboarding token" ]]; then
    echo "✅ PASS: Correctly rejected invalid token with 404"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 404 with 'Invalid onboarding token', got $STATUS"
    echo "   Response: $BODY"
fi

# Test 3: Invalid itemId (should return 404)
echo -e "\n[TEST 3/4] Testing invalid itemId..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
INVALID_ITEM_ID="invalid-item-id-12345"
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$SAMPLE_TARGET" -w "\n%{http_code}" "$BASE_URL/onboarding/$VALID_TOKEN/items/$INVALID_ITEM_ID/save-target")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "404" ]] && [[ "$BODY" =~ "Item not found" ]]; then
    echo "✅ PASS: Correctly rejected invalid itemId with 404"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 404 with 'Item not found', got $STATUS"
    echo "   Response: $BODY"
fi

# Test 4: Valid request (should return 200)
echo -e "\n[TEST 4/4] Testing valid save target request..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$SAMPLE_TARGET" -w "\n%{http_code}" "$BASE_URL/onboarding/$VALID_TOKEN/items/$VALID_ITEM_ID/save-target")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "200" ]] && [[ "$BODY" =~ "success.*true" ]] && [[ "$BODY" =~ "123456789" ]]; then
    echo "✅ PASS: Successfully saved target with 200"
    echo "   Response includes target data"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 200 with success=true and target data, got $STATUS"
    echo "   Response: $BODY"
fi

echo -e "\n📊 Save Target Tests: $PASSED_TESTS/4 PASSED"

echo -e "\n$(printf '=%.0s' {1..80})"
echo "TESTING: Target Discovery Endpoint - POST /api/oauth/:platformKey/discover-targets"
echo "$(printf '=%.0s' {1..80})"

# Test Target Discovery for each platform
for PLATFORM in ga4 gtm google-ads; do
    echo -e "\n--- Testing platform: $PLATFORM ---"
    
    # Test 1: Missing accessToken (should return 400)
    echo -e "\n[TEST] Testing missing accessToken for $PLATFORM..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' -w "\n%{http_code}" "$BASE_URL/oauth/$PLATFORM/discover-targets")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [[ "$STATUS" == "400" ]] && [[ "$BODY" =~ "accessToken is required" ]]; then
        echo "✅ PASS: Correctly rejected missing accessToken for $PLATFORM"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ FAIL: Expected 400 with 'accessToken is required' for $PLATFORM, got $STATUS"
        echo "   Response: $BODY"
    fi
    
    # Test 2: Fake accessToken (should return error)
    echo -e "\n[TEST] Testing fake accessToken for $PLATFORM..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAKE_TOKEN_DATA='{"accessToken": "fake_access_token_12345"}'
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$FAKE_TOKEN_DATA" -w "\n%{http_code}" "$BASE_URL/oauth/$PLATFORM/discover-targets")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    # Should return error status (400, 401, 500, 501)
    if [[ "$STATUS" =~ ^(400|401|500|501)$ ]]; then
        # Check for expected error patterns
        if [[ "$BODY" =~ ("not configured"|"oauth is not configured"|"not found"|"invalid"|"unauthorized"|"failed"|"does not support") ]]; then
            echo "✅ PASS: Correctly handled fake token for $PLATFORM (Status: $STATUS)"
            echo "   Error message contains expected patterns"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo "❌ FAIL: Unexpected error message for $PLATFORM: $BODY"
        fi
    else
        echo "❌ FAIL: Expected error status for $PLATFORM, got $STATUS"
        echo "   Response: $BODY"
    fi
done

echo -e "\n📊 Target Discovery Tests: $((PASSED_TESTS - 4))/6 PASSED"

echo -e "\n$(printf '=%.0s' {1..80})"
echo "TESTING: Regression - Existing Onboarding Endpoints"
echo "$(printf '=%.0s' {1..80})"

# Test 1: GET /api/onboarding/:token (should return onboarding data)
echo -e "\n[TEST 1/2] Testing GET onboarding data..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X GET -w "\n%{http_code}" "$BASE_URL/onboarding/$VALID_TOKEN")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "200" ]] && [[ "$BODY" =~ "success.*true" ]] && [[ "$BODY" =~ "client" ]] && [[ "$BODY" =~ "items" ]]; then
    echo "✅ PASS: Successfully retrieved onboarding data"
    # Extract client name if possible
    CLIENT_NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Client: ${CLIENT_NAME:-'Found'}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 200 with client and items data, got $STATUS"
    echo "   Response: $BODY"
fi

# Test 2: POST /api/onboarding/:token/items/:itemId/attest (should still work)
echo -e "\n[TEST 2/2] Testing POST attestation endpoint..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
ATTEST_DATA='{"attestationText": "I have granted the requested access to my GA4 account", "clientProvidedTarget": {"propertyId": "123456789", "propertyName": "Test Property", "assetType": "GA4_PROPERTY"}}'
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$ATTEST_DATA" -w "\n%{http_code}" "$BASE_URL/onboarding/$VALID_TOKEN/items/$VALID_ITEM_ID/attest")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$STATUS" == "200" ]] && [[ "$BODY" =~ "success.*true" ]]; then
    echo "✅ PASS: Successfully submitted attestation"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAIL: Expected 200 with success=true, got $STATUS"
    echo "   Response: $BODY"
fi

echo -e "\n📊 Regression Tests: $((PASSED_TESTS - 10))/2 PASSED"

# Final Results
echo -e "\n$(printf '=%.0s' {1..80})"
echo "🎯 FINAL TEST RESULTS"
echo "$(printf '=%.0s' {1..80})"
echo "✅ PASSED: $PASSED_TESTS/$TOTAL_TESTS tests"
echo "❌ FAILED: $((TOTAL_TESTS - PASSED_TESTS))/$TOTAL_TESTS tests"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "📈 SUCCESS RATE: ${SUCCESS_RATE}%"

if [[ $SUCCESS_RATE -ge 80 ]]; then
    echo "🎉 TARGET DISCOVERY AND SAVE TARGET API TESTING COMPLETED SUCCESSFULLY!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the implementation."
    exit 1
fi