from django.shortcuts import render
from .models import Plan
from rest_framework.generics import ListAPIView
from .serializers import PlanSerializer
# Create your views here.

class PlanListView(ListAPIView):
    serializer_class = PlanSerializer
    def get_queryset(self):
        return (
            Plan.objects
            .filter(is_active=True)
            .prefetch_related("benefits")
        )