from django.shortcuts import render
from .models import Plan, Subscription
from rest_framework.generics import ListAPIView
from .serializers import PlanSerializer, SubscriptionSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
# Create your views here.

class PlanListView(ListAPIView):
    serializer_class = PlanSerializer
    def get_queryset(self):
        return (
            Plan.objects
            .filter(is_active=True)
            .prefetch_related("benefits")
        )

class CurrentSubscriptionView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:
            subscription = request.user.subscription

        except Subscription.DoesNotExist:
            return Response(
                {
                    "detail": "El usuario no tiene una suscripción."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SubscriptionSerializer(subscription)

        return Response(serializer.data)