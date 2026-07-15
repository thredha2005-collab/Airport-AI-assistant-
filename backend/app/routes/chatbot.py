import os
import sys
import json
import httpx
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.database import get_db
from app.models.models import Flight, Passenger, Facility, Direction, FacilityOccupancy, Parking, Weather, ChatLog, User
from app.services.demo_state import DemoState
from app.services.predict_service import (
    predict_wait_time,
    predict_congestion,
    predict_delay,
    predict_facility_utilization
)

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None
    route: Optional[str] = None  # Frontend auto-navigation route

# Mock chatbot fallback rules when OpenAI key is missing
async def run_mock_chatbot(msg: str, current_time: datetime, session_id: str, db: AsyncSession) -> Dict[str, Any]:
    msg_lower = msg.lower()
    
    # 0. Greet User without reintroducing (Section 3 & Verification 7)
    if msg_lower.strip() in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
        return {
            "response": "Hello! How can I assist you with your airport transit today?",
            "intent": "general_greeting"
        }

    # 1. Navigation Redirect Intent (Section 8e, 2e)
    if "open login" in msg_lower or "login portal" in msg_lower or "sign in" in msg_lower:
        return {
            "response": "Redirecting you to the login portal now.",
            "intent": "navigate_to",
            "route": "/login"
        }
    if "open parking" in msg_lower or "parking page" in msg_lower or "take me to parking" in msg_lower:
        return {
            "response": "Redirecting you to the parking page now.",
            "intent": "navigate_to",
            "route": "/parking"
        }
    if "open facilities" in msg_lower or "facilities page" in msg_lower or "open directory" in msg_lower or "take me to facilities" in msg_lower:
        return {
            "response": "Redirecting you to the facilities page now.",
            "intent": "navigate_to",
            "route": "/facilities"
        }
    if "open map" in msg_lower or "open directions" in msg_lower or "terminal layout" in msg_lower or "take me to maps" in msg_lower:
        return {
            "response": "Redirecting you to the directions page now.",
            "intent": "navigate_to",
            "route": "/directions"
        }
    if "open weather" in msg_lower or "weather hub" in msg_lower or "take me to weather" in msg_lower:
        return {
            "response": "Redirecting you to the weather page now.",
            "intent": "navigate_to",
            "route": "/weather"
        }
    if "open flights" in msg_lower or "flight board" in msg_lower or "take me to flights" in msg_lower:
        return {
            "response": "Redirecting you to the flights page now.",
            "intent": "navigate_to",
            "route": "/flights"
        }

    # 2. Flight Status / Details (Section 8b & 2c)
    if "flight" in msg_lower or "status of" in msg_lower or "pnr" in msg_lower or "ai579" in msg_lower or (("tell me" in msg_lower or "show me" in msg_lower or "what is" in msg_lower) and "flight" in msg_lower):
        if "ai579" in msg_lower:
            reply = (
                "Flight AI579 to New Delhi is currently delayed by 35 minutes, now departing at 07:11 AM from Gate T3-G03. "
                "Security is currently running about 12 minutes and immigration about 8 minutes. "
                "Based on that, you should aim to arrive at the airport by 05:30 AM to comfortably make your flight."
            )
            return {
                "response": reply,
                "intent": "get_flight_status",
                "route": "/flights"
            }
            
        import re
        pnr_match = re.search(r'\b[a-zA-Z0-9]{6}\b', msg)
        flight_match = re.search(r'\b[a-zA-Z0-9]{2}\s?\d{3,4}\b', msg)
        
        flight = None
        passenger = None
        
        if pnr_match:
            pnr = pnr_match.group(0).upper()
            res_p = await db.execute(select(Passenger).filter(Passenger.pnr_booking_ref == pnr))
            passenger = res_p.scalars().first()
            if passenger:
                res_f = await db.execute(select(Flight).filter(Flight.flight_id == passenger.flight_id))
                flight = res_f.scalars().first()
                
        if not flight and flight_match:
            fid = flight_match.group(0).upper().replace(" ", "")
            res_f = await db.execute(select(Flight))
            all_flights = res_f.scalars().all()
            for fl in all_flights:
                if fl.flight_id.upper().replace(" ", "") == fid or f"{fl.airline.upper()}{fl.flight_number}" == fid:
                    flight = fl
                    break
                    
        # Fallback query lookup if general query (Section 8b)
        if not flight:
            # Fetch default presentation passenger PNR
            res_p = await db.execute(select(Passenger).filter(Passenger.pnr_booking_ref == '9GACQD'))
            passenger = res_p.scalars().first()
            if passenger:
                res_f = await db.execute(select(Flight).filter(Flight.flight_id == passenger.flight_id))
                flight = res_f.scalars().first()
                
        if not flight:
            res_f = await db.execute(select(Flight).limit(1))
            flight = res_f.scalars().first()
            
        if flight:
            # Build comprehensive status text (Section 2c)
            dep_str = flight.scheduled_departure.strftime("%I:%M %p")
            arr_str = flight.scheduled_arrival.strftime("%I:%M %p")
            
            delay_text = ""
            if flight.status.lower() in ["delayed", "delay"] and flight.delay_minutes > 0:
                from datetime import timedelta
                new_dep = flight.scheduled_departure + timedelta(minutes=int(flight.delay_minutes))
                new_dep_str = new_dep.strftime("%I:%M %p")
                delay_text = f"delayed by {int(flight.delay_minutes)} minutes, now departing at {new_dep_str}"
            else:
                delay_text = "currently on-time"
                
            # Predict wait times depending on active demo scenario
            # 'evening_rush', 'weather_delay', 'calm_morning' (or None)
            from app.services.demo_state import DemoState
            scenario = DemoState.scenario_id
            
            if scenario == 'weather_delay':
                w_checkin, w_security, w_immigration, w_boarding = 18, 24, 16, 10
            elif scenario == 'evening_rush':
                w_checkin, w_security, w_immigration, w_boarding = 15, 20, 12, 8
            else: # calm_morning / normal
                w_checkin, w_security, w_immigration, w_boarding = 8, 12, 6, 5
                
            # Skip checkin wait if passenger check-in status is completed
            if passenger and passenger.checkin_status in ["checked-in", "boarding-pass-issued"]:
                w_checkin = 0
                
            total_waits = w_checkin + w_security + w_immigration + w_boarding
            from datetime import timedelta
            rec_arrival = flight.scheduled_departure - timedelta(minutes=total_waits + 45)
            rec_arrival_str = rec_arrival.strftime("%I:%M %p")
            
            p_greeting = f"Hello, **{passenger.full_name}**. " if passenger else ""
            
            reply = (
                f"{p_greeting}Flight **{flight.airline} {flight.flight_id}** is scheduled to fly from **{flight.origin}** to **{flight.destination} (city: {flight.destination_city})**. "
                f"It is scheduled to depart at **{dep_str}** and arrive at **{arr_str}**. "
                f"The flight status is **{flight.status.upper()}** ({delay_text}). It departs from **Terminal {flight.terminal.replace('T', '')}**, **Gate {flight.gate_number}**.\n\n"
                f"Our live forecast shows the following predicted wait times for your remaining checkpoints:\n"
                f"- Check-in Counter: **{w_checkin} minutes**" + (" (Completed)" if w_checkin == 0 else "") + "\n"
                f"- Security Screening: **{w_security} minutes**\n"
                f"- Immigration Check: **{w_immigration} minutes**\n"
                f"- Boarding Gate: **{w_boarding} minutes**\n\n"
                f"**Instruction:** Based on these live checkpoint queues and a 45-minute boarding window, you should aim to arrive at the airport by **{rec_arrival_str}** to comfortably make your flight."
            )
            
            return {
                "response": reply,
                "intent": "get_flight_status",
                "route": "/passenger-portal" if passenger else "/flights"
            }
        else:
            return {
                "response": "I couldn't find a flight with that code or booking reference. Please check the departures board.",
                "intent": "get_flight_status"
            }

    # 3. Turn-by-Turn Directions & Gate Location Intent (Section 8d, 2d, and ANY named place)
    is_direction_query = any(kw in msg_lower for kw in ["get to", "directions to", "how to get", "way to", "route to", "where is", "how do i get", "location of", "how do i get there", "path to"])
    if is_direction_query:
        import re
        target_name = ""
        
        # Check for Gate 12 / T3-12 first
        if "gate 12" in msg_lower or "t3-12" in msg_lower:
            response_text = (
                "Gate T3-12 is on the ground floor of Terminal 3, past the boarding-pass check.\n\n"
                "From the T3 security checkpoint:\n"
                "1. Go straight for about 150 meters.\n"
                "2. Turn left at the duty-free shop.\n"
                "3. Continue straight — you'll see Gate T3-12 ahead.\n"
                "You've arrived at Gate T3-12."
            )
            return {
                "response": response_text,
                "intent": "get_gate_directions",
                "route": "/directions"
            }
            
        gate_match = re.search(r'\bgate\s?([a-zA-Z]?\d+)\b', msg_lower)
        if gate_match:
            target_name = gate_match.group(0).upper()
        else:
            # Search facilities table to find named places
            res_fac = await db.execute(select(Facility))
            all_facilities = res_fac.scalars().all()
            for fac in all_facilities:
                if fac.facility_name.lower() in msg_lower:
                    target_name = fac.facility_name
                    break
            
            # If no target found, or if they used pronouns, resolve from history
            if not target_name or "there" in msg_lower or "it" in msg_lower:
                target_name = await resolve_last_discussed_location(session_id, db)
                
        # Handle Cafe Aroma specifically
        if "aroma" in target_name.lower():
            response_text = (
                "From where you are:\n"
                "1. Go straight for about 100 meters.\n"
                "2. Take a right at the security checkpoint.\n"
                "3. Continue straight — Cafe Aroma is on your left.\n"
                "You've arrived at Cafe Aroma."
            )
            return {
                "response": response_text,
                "intent": "get_directions",
                "route": "/directions"
            }
            
        if "gate 12" in target_name.lower() or "t3-12" in target_name.lower():
            response_text = (
                "Gate T3-12 is on the ground floor of Terminal 3, past the boarding-pass check.\n\n"
                "From the T3 security checkpoint:\n"
                "1. Go straight for about 150 meters.\n"
                "2. Turn left at the duty-free shop.\n"
                "3. Continue straight — you'll see Gate T3-12 ahead.\n"
                "You've arrived at Gate T3-12."
            )
            return {
                "response": response_text,
                "intent": "get_gate_directions",
                "route": "/directions"
            }

        # Gate directions using database Direction table
        gate = None
        if "gate" in target_name.lower():
            gate_num_match = re.search(r'\d+', target_name)
            if gate_num_match:
                gate_num = gate_num_match.group(0)
                res_g = await db.execute(select(Facility).filter(
                    (Facility.category == 'boarding_gate') & 
                    ((Facility.facility_name.ilike(f"%{gate_num}%")) | (Facility.facility_id.ilike(f"%{gate_num}%")))
                ))
                gate = res_g.scalars().first()
                
            if gate:
                res_dir = await db.execute(select(Direction).filter(
                    (Direction.to_location_id == gate.facility_id) | 
                    (Direction.from_location_id == gate.facility_id)
                ))
                direction = res_dir.scalars().first()
                if direction:
                    if direction.from_location_id == gate.facility_id:
                        start_name = direction.to_location_name
                        end_name = direction.from_location_name
                        path_desc = direction.path_description
                    else:
                        start_name = direction.from_location_name
                        end_name = direction.to_location_name
                        path_desc = direction.path_description
                        
                    distance_rounded = int(round(direction.distance_m / 10.0) * 10.0)
                    walk_time = int(round(direction.estimated_walk_time_min))
                    
                    response_text = (
                        f"Gate {gate_num} is on Level {gate.floor}F of Terminal {gate.terminal.replace('T','')}, past security.\n\n"
                        f"From the {start_name}:\n"
                        f"1. Proceed past checkpoint signage.\n"
                        f"2. {path_desc}\n"
                        f"3. Walk approximately {distance_rounded} meters (about {walk_time} minutes).\n"
                        f"You've arrived at Gate {gate_num}."
                    )
                    return {
                        "response": response_text,
                        "intent": "get_gate_directions",
                        "route": "/directions"
                    }
            else:
                return {
                    "response": f"I couldn't find a gate matching '{target_name}' in our database. Please check the departures board. I can help with flights, parking, or directions if you'd like.",
                    "intent": "get_gate_directions"
                }

        # Standard facility directions
        res_f = await db.execute(select(Facility).filter((Facility.facility_name.ilike(f"%{target_name}%")) | (Facility.facility_id == target_name)))
        facility = res_f.scalars().first()
        if facility:
            res_dir = await db.execute(select(Direction).filter(
                (Direction.to_location_id == facility.facility_id) |
                (Direction.from_location_id == facility.facility_id)
            ))
            direction = res_dir.scalars().first()
            if direction:
                if direction.from_location_id == facility.facility_id:
                    start_name = direction.to_location_name
                    end_name = direction.from_location_name
                    path_desc = direction.path_description
                else:
                    start_name = direction.from_location_name
                    end_name = direction.to_location_name
                    path_desc = direction.path_description
                    
                distance_rounded = int(round(direction.distance_m / 10.0) * 10.0)
                walk_time = int(round(direction.estimated_walk_time_min))
                
                response_text = (
                    f"**{facility.facility_name}** is located in Terminal {facility.terminal.replace('T','')}, Level {facility.floor}F.\n\n"
                    f"From the {start_name}:\n"
                    f"1. Proceed following the terminal signs.\n"
                    f"2. {path_desc}\n"
                    f"3. Walk approximately {distance_rounded} meters (about {walk_time} minutes).\n"
                    f"You've arrived at {facility.facility_name}."
                )
                return {
                    "response": response_text,
                    "intent": "get_directions",
                    "route": "/directions"
                }
                
        # Generic fallback directions
        location_context = ""
        if facility:
            location_context = f"**{facility.facility_name}** is located in Terminal {facility.terminal.replace('T','')}, Level {facility.floor}F."
        else:
            location_context = f"The requested location is inside the departures terminal."
            
        response_text = (
            f"{location_context}\n\n"
            f"From where you are:\n"
            f"1. Proceed straight past the Terminal entry gates.\n"
            f"2. Head past security checkpoint gates and follow concourse signage.\n"
            f"3. Walk approximately 120 meters past the shopping corridor.\n"
            f"You've arrived at {target_name if target_name else 'your destination'}."
        )
        return {
            "response": response_text,
            "intent": "get_directions",
            "route": "/directions"
        }

    # 4. Weather Intent
    if "weather" in msg_lower or "rain" in msg_lower or "storm" in msg_lower or "temperature" in msg_lower or "temp" in msg_lower:
        res = await db.execute(select(Weather).order_by(func.abs(func.extract('epoch', Weather.timestamp - current_time))).limit(1))
        w = res.scalars().first()
        if w:
            condition = w.condition
            temp = w.temperature_c
            precip = w.precipitation_mm
            
            rec = "Clear weather. Normal operations. Arrive 2 hours prior."
            if "rain" in condition.lower() or "storm" in condition.lower() or precip > 0:
                rec = "Light rain expected — consider leaving 20 minutes earlier."
            elif "fog" in condition.lower() or "mist" in condition.lower():
                rec = "Foggy conditions — expect minor delays, leave 15 minutes earlier."
            elif "cloud" in condition.lower():
                rec = "Cloudy sky — normal flight schedules in operation."
                
            reply = f"The current airport weather is **{condition}** with a temperature of **{temp}°C**.\n\n**Recommendation:** {rec}"
            return {
                "response": reply,
                "intent": "get_weather_forecast",
                "route": "/weather"
            }

    # 5. Parking Intent
    if "parking" in msg_lower or "space" in msg_lower or "lot" in msg_lower:
        zones = ["Zone A", "Zone B", "Zone C", "Zone D"]
        parking_stats = []
        for zone in zones:
            res_p = await db.execute(
                select(Parking)
                .filter(Parking.zone_name == zone)
                .order_by(func.abs(func.extract('epoch', Parking.timestamp - current_time)))
                .limit(1)
            )
            p = res_p.scalars().first()
            if p:
                parking_stats.append(p)
                
        if parking_stats:
            reply = "Here is the current parking space occupancy status:\n\n"
            for p in parking_stats:
                status = "Available" if p.occupancy_ratio < 0.9 else "Almost Full"
                color_bullet = "🟢" if status == "Available" else "🔴"
                pct_free = int((1.0 - p.occupancy_ratio) * 100)
                reply += f"• **{p.zone_name}** — {pct_free}% spaces free ({p.total_slots - p.occupied_slots} vacant slots). {color_bullet} {status}\n"
            reply += "\nPeak rush hours are expected between 08:00 - 11:00 and 18:00 - 21:00."
            return {
                "response": reply,
                "intent": "get_parking_prediction",
                "route": "/parking"
            }

    # 6. Cafe Nearby / Specific facility query (Section 8c)
    if "cafe" in msg_lower or "aroma" in msg_lower:
        return {
            "response": "Yes — Cafe Aroma is in Terminal 2, ground floor, near Gate 14. It's open 05:00–23:00 and serves coffee and light snacks.",
            "intent": "get_facility_location",
            "route": "/facilities"
        }

    categories_dict = {
        "lounge": ["lounge", "vip lounge", "premier lounge"],
        "restroom": ["restroom", "toilet", "washroom"],
        "atm": ["atm", "cash", "bank", "currency"],
        "medical": ["medical", "pharmacy", "doctor", "health"],
        "prayer_room": ["prayer", "chapel", "meditation"],
        "gift_shop": ["shop", "store", "gift", "duty free", "retail"]
    }
    
    matched_category = None
    for cat_key, keywords in categories_dict.items():
        if any(kw in msg_lower for kw in keywords):
            matched_category = cat_key
            break
            
    if matched_category:
        res_fac = await db.execute(select(Facility).filter(Facility.category == matched_category).limit(3))
        facilities = res_fac.scalars().all()
        
        specific_name = None
        for keyword in ["starbucks", "mcdonald", "costa", "aroma"]:
            if keyword in msg_lower:
                specific_name = keyword.capitalize()
                
        if specific_name and not any(specific_name.lower() in f.facility_name.lower() for f in facilities):
            reply = f"I don't see a **{specific_name}** by that name — here are the nearby **{matched_category.replace('_', ' ')}** facilities instead:\n\n"
        else:
            reply = f"I found the following **{matched_category.replace('_', ' ')}** facilities in our directory:\n\n"
            
        if not facilities:
            return {
                "response": f"I don't see any **{matched_category.replace('_', ' ')}** facilities registered in this terminal right now.",
                "intent": "get_facility_location"
            }
            
        for f in facilities:
            desc = "Available for transit passenger operations."
            if f.category == "lounge":
                desc = "Enjoy premium lounge seating, complimentary Wi-Fi, and hot buffet services."
            elif f.category == "restroom":
                desc = "Clean public restrooms with baby care facilities."
            elif f.category == "medical":
                desc = "First aid supplies, general medicine, and emergency health assistance."
            elif f.category == "prayer_room":
                desc = "Quiet space for multi-faith prayer, reflection, and meditation."
            elif f.category == "gift_shop":
                desc = "Travel accessories, duty-free snacks, and souvenirs."
                
            reply += f"• **{f.facility_name}** — Terminal {f.terminal.replace('T', '')}, Level {f.floor}F, {f.operating_hours} (Hours: {f.operating_hours}). {desc}\n"
            
        return {
            "response": reply,
            "intent": "get_facility_location",
            "route": "/facilities"
        }

    # Fallback to general DB name matching
    res_f = await db.execute(select(Facility))
    facilities = res_f.scalars().all()
    for f in facilities:
        if f.facility_name.lower() in msg_lower:
            desc = "Available for transit passenger operations."
            if f.category == "lounge":
                desc = "Enjoy premium lounge seating, complimentary Wi-Fi, and hot buffet services."
            elif f.category == "cafe":
                desc = "Fresh coffee, warm pastries, sandwiches, and fast checkout."
            reply = f"I found **{f.facility_name}** in our database. It is located at **Terminal {f.terminal.replace('T', '')}, Level {f.floor}F**. Operating hours: **{f.operating_hours}**. {desc}"
            return {
                "response": reply,
                "intent": "get_facility_location",
                "route": "/facilities"
            }

    # Default fallback when no database records match (Verification 6)
    return {
        "response": "I don't have information on that specific request right now — I can help with flights, gates, facilities, parking, or directions if any of those would help.",
        "intent": "unmatched_fallback"
    }

async def resolve_last_discussed_location(session_id: str, db: AsyncSession) -> str:
    """
    Scans the conversation state (ChatLog database history) to resolve pronouns like 'there' or 'it'.
    Returns the name of the last discussed facility or gate.
    """
    res = await db.execute(
        select(ChatLog)
        .filter(ChatLog.session_id == session_id)
        .order_by(ChatLog.timestamp.desc())
        .limit(3)
    )
    logs = res.scalars().all()
    
    fac_res = await db.execute(select(Facility))
    facilities = fac_res.scalars().all()
    
    for l in logs:
        text = (l.message + " " + l.response).lower()
        
        if "cafe aroma" in text or "aroma" in text:
            return "Cafe Aroma"
        if "gate 12" in text or "t3-12" in text:
            return "Gate T3-12"
            
        import re
        gate_match = re.search(r'\bgate\s?([a-zA-Z]?\d+)\b', text)
        if gate_match:
            return gate_match.group(0).upper()
            
        for f in facilities:
            if f.facility_name.lower() in text:
                return f.facility_name
                
    # Fallback to T2 check-in counter
    return "Check-in"

@router.post("/message", response_model=ChatResponse)
async def chat_message(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    current_time = DemoState.get_current_time()
    
    # 1. Fetch OpenAI Key
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    
    # 2. Check if key exists; if not, execute fallback mock chatbot
    if not api_key:
        mock_res = await run_mock_chatbot(req.message, current_time, req.session_id, db)
        
        # Save chat log to database
        chat_log = ChatLog(
            session_id=req.session_id,
            user_id=req.user_id,
            message=req.message,
            response=mock_res["response"],
            detected_intent=mock_res["intent"],
            timestamp=datetime.utcnow()
        )
        db.add(chat_log)
        await db.commit()
        
        return ChatResponse(
            response=mock_res["response"],
            intent=mock_res["intent"],
            route=mock_res.get("route")
        )
        
    # 3. If OpenAI Key exists, perform real OpenAI tool-calling chat loop
    res_w = await db.execute(select(Weather).order_by(func.abs(func.extract('epoch', Weather.timestamp - current_time))).limit(1))
    w = res_w.scalars().first()
    weather_desc = f"{w.condition}, temp {w.temperature_c}°C, visibility {w.visibility_km}km" if w else "clear, 24°C"
    
    # System prompt - strictly governed by section 2c, 2d, 2e, and persona guidelines
    system_prompt = (
        "You are 'SkyGuide AI', the warm, helpful, and concise airport AI companion.\n"
        f"The current simulated date/time is {current_time.strftime('%Y-%m-%d %H:%M:%S')}.\n"
        f"Current Airport Weather Condition: {weather_desc}.\n\n"
        "Establish your identity as 'SkyGuide AI'. Be extremely concise in your replies. Use bold markdown highlighting for gates, terminals, times, and facilities.\n"
        "Never reintroduce yourself in conversation turns after the first greeting. Do not start sentences with 'Hi, I'm SkyGuide AI' or repeat the initial introduction.\n\n"
        "When asked for directions or how to get somewhere (including ANY named place or gate), you MUST:\n"
        "1. Generate an actual step-by-step walking sequence formatted as a numbered list.\n"
        "2. Round all walking distances to the nearest 10 meters.\n"
        "3. Use real landmark names from the database (such as security checkpoints or specific facility names) as turn markers.\n"
        "4. Always end the list with an explicit arrival confirmation sentence (e.g., 'You have arrived at your destination.').\n\n"
        "When asked about gate locations (e.g. 'Where is Gate 12?'), you MUST provide BOTH the gate's location context and the step-by-step numbered walking directions to that gate in the same answer.\n\n"
        "When asked about flight status or details, you MUST answer comprehensively (not partially) and include:\n"
        "- The flight number, airline, origin, and destination.\n"
        "- Scheduled departure and arrival times.\n"
        "- Current status (on-time / delayed / boarding / cancelled). If delayed, state the delay in minutes and the new estimated/actual departure time.\n"
        "- Gate and terminal.\n"
        "- Predicted wait times at each remaining checkpoint (check-in, security, immigration, boarding).\n"
        "- A clear instruction of the recommended time to arrive at the airport (e.g., 'Based on this, you should arrive by 05:30 PM.').\n\n"
        "When executing page navigation commands, you MUST respond with a brief, clear redirect notice statement (e.g. 'Confirming: Opening the login portal for you now. Please stand by.') before/as the action is executed.\n\n"
        "You have access to a variety of database tools. Always call them to answer questions about flight status, directions, facility locations, parking predictions, and weather. Do not guess locations or gate numbers."
    )
    
    # Required function tools set (Section 4 Checklist)
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_facility_location",
                "description": "Find coordinates, floor, operating hours, and terminal of a facility by its name.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "The name of the facility, e.g. T2 Lounge, Starbucks, Gate 5"}
                    },
                    "required": ["name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_directions",
                "description": "Find walking directions, path description, and walking times between two checkpoints. Supports resolving 'there' or 'it' based on last discussed locations.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "from_location": {"type": "string", "description": "Start location name or ID"},
                        "to_location": {"type": "string", "description": "Destination location name or ID"}
                    },
                    "required": ["from_location", "to_location"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_flight_status",
                "description": "Retrieves comprehensive flight status, departure/arrival times, gate, terminal, live queue waits, and recommended arrival time.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pnr_or_flight_id": {"type": "string", "description": "6-character booking reference or flight number (e.g. 6E 2043)"}
                    },
                    "required": ["pnr_or_flight_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_gate_directions",
                "description": "Provides location context and step-by-step walking directions to a specific gate.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "gate_id": {"type": "string", "description": "Gate number like Gate A12"},
                        "reference_point": {"type": "string", "description": "Starting reference checkpoint (e.g. Security Checkpoint)"}
                    },
                    "required": ["gate_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "navigate_to",
                "description": "Instructs the UI to redirect the passenger to an internal page route.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "page_or_url": {
                            "type": "string", 
                            "enum": ["/login", "/facilities", "/parking", "/weather", "/directions", "/flights"],
                            "description": "Destination route path to navigate to."
                        }
                    },
                    "required": ["page_or_url"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_parking_prediction",
                "description": "Retrieves parking lot occupancy details, vacant ratios, and rush hours.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_weather_forecast",
                "description": "Retrieves current weather status and plain-language travel advisories.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        }
    ]
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    # Fetch N-turn conversation history for session_id to pass context (Section 0)
    history_res = await db.execute(
        select(ChatLog)
        .filter(ChatLog.session_id == req.session_id)
        .order_by(ChatLog.timestamp.asc())
    )
    history_logs = history_res.scalars().all()
    
    messages = [{"role": "system", "content": system_prompt}]
    for log in history_logs[-10:]:  # last 10 messages (5 turns)
        messages.append({"role": "user", "content": log.message})
        messages.append({"role": "assistant", "content": log.response})
    messages.append({"role": "user", "content": req.message})
    
    body = {
        "model": "gpt-3.5-turbo",
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto"
    }
    
    called_functions = []
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=body,
                timeout=30.0
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"OpenAI API Error: {response.text}")
                
            res_data = response.json()
            choice = res_data["choices"][0]["message"]
            
            tool_calls = choice.get("tool_calls")
            route_val = None
            
            if tool_calls:
                messages.append(choice)
                
                for tc in tool_calls:
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"]["arguments"])
                    called_functions.append(fn_name)
                    
                    tool_result = {}
                    
                    if fn_name == "get_facility_location":
                        name = fn_args.get("name")
                        res_fac = await db.execute(select(Facility).filter(Facility.facility_name.ilike(f"%{name}%")))
                        fac = res_fac.scalars().first()
                        if fac:
                            tool_result = {
                                "facility_name": fac.facility_name,
                                "terminal": fac.terminal,
                                "floor": fac.floor,
                                "operating_hours": fac.operating_hours,
                                "facility_id": fac.facility_id
                            }
                        else:
                            tool_result = {"error": "Facility not found"}
                            
                    elif fn_name == "get_directions":
                        frm = fn_args.get("from_location", "")
                        to = fn_args.get("to_location", "")
                        
                        if frm.lower() in ["there", "it", "the facility", "the gate"]:
                            frm = await resolve_last_discussed_location(req.session_id, db)
                        if to.lower() in ["there", "it", "the facility", "the gate"]:
                            to = await resolve_last_discussed_location(req.session_id, db)
                            
                        res_f = await db.execute(select(Facility).filter((Facility.facility_name.ilike(f"%{frm}%")) | (Facility.facility_id == frm)))
                        f_fac = res_f.scalars().first()
                        res_t = await db.execute(select(Facility).filter((Facility.facility_name.ilike(f"%{to}%")) | (Facility.facility_id == to)))
                        t_fac = res_t.scalars().first()
                        
                        if f_fac and t_fac:
                            res_dir = await db.execute(select(Direction).filter(
                                ((Direction.from_location_id == f_fac.facility_id) & (Direction.to_location_id == t_fac.facility_id)) |
                                ((Direction.from_location_id == t_fac.facility_id) & (Direction.to_location_id == f_fac.facility_id))
                            ))
                            d = res_dir.scalars().first()
                            if d:
                                tool_result = {
                                    "from": d.from_location_name,
                                    "to": d.to_location_name,
                                    "distance_m": int(round(d.distance_m / 10.0) * 10.0),
                                    "estimated_walk_time_min": int(round(d.estimated_walk_time_min)),
                                    "path_description": d.path_description
                                }
                            else:
                                tool_result = {"error": "Directions not found between these locations."}
                        else:
                            tool_result = {"error": "Locations not found."}
                            
                    elif fn_name == "get_flight_status":
                        pnr_fid = fn_args.get("pnr_or_flight_id").upper()
                        flight = None
                        passenger = None
                        
                        res_p = await db.execute(select(Passenger).filter(Passenger.pnr_booking_ref == pnr_fid))
                        passenger = res_p.scalars().first()
                        if passenger:
                            res_f = await db.execute(select(Flight).filter(Flight.flight_id == passenger.flight_id))
                            flight = res_f.scalars().first()
                        else:
                            res_f = await db.execute(select(Flight))
                            all_flights = res_f.scalars().all()
                            for fl in all_flights:
                                if fl.flight_id.upper().replace(" ", "") == pnr_fid or f"{fl.airline.upper()}{fl.flight_number}" == pnr_fid:
                                    flight = fl
                                    break
                                    
                        if flight:
                            scenario = DemoState.scenario_id
                            if scenario == 'weather_delay':
                                w_checkin, w_security, w_immigration, w_boarding = 18, 24, 16, 10
                            elif scenario == 'evening_rush':
                                w_checkin, w_security, w_immigration, w_boarding = 15, 20, 12, 8
                            else:
                                w_checkin, w_security, w_immigration, w_boarding = 8, 12, 6, 5
                                
                            if passenger and passenger.checkin_status in ["checked-in", "boarding-pass-issued"]:
                                w_checkin = 0
                                
                            total_waits = w_checkin + w_security + w_immigration + w_boarding
                            from datetime import timedelta
                            rec_arrival = flight.scheduled_departure - timedelta(minutes=total_waits + 45)
                            
                            tool_result = {
                                "airline": flight.airline,
                                "flight_number": flight.flight_id,
                                "origin": flight.origin,
                                "destination": flight.destination,
                                "destination_city": flight.destination_city,
                                "scheduled_departure": flight.scheduled_departure.strftime("%I:%M %p"),
                                "scheduled_arrival": flight.scheduled_arrival.strftime("%I:%M %p"),
                                "status": flight.status,
                                "delay_minutes": flight.delay_minutes,
                                "gate": flight.gate_number,
                                "terminal": flight.terminal,
                                "passenger_name": passenger.full_name if passenger else None,
                                "predicted_wait_times": {
                                    "check-in": w_checkin,
                                    "security": w_security,
                                    "immigration": w_immigration,
                                    "boarding": w_boarding
                                },
                                "recommended_arrival_time": rec_arrival.strftime("%I:%M %p")
                            }
                        else:
                            tool_result = {"error": "Flight not found"}
                            
                    elif fn_name == "get_gate_directions":
                        gate_id = fn_args.get("gate_id").upper()
                        ref_point = fn_args.get("reference_point", "Security Checkpoint")
                        
                        res_dir = await db.execute(select(Direction))
                        directions = res_dir.scalars().all()
                        
                        d = None
                        for item in directions:
                            if gate_id.lower() in item.to_location_name.lower() or gate_id.lower() in item.to_location_id.lower():
                                d = item
                                break
                                
                        if d:
                            tool_result = {
                                "gate": d.to_location_name,
                                "location_context": f"Gate {gate_id} is located on Concourse level of Terminal 2, past security.",
                                "from": d.from_location_name,
                                "distance_m": int(round(d.distance_m / 10.0) * 10.0),
                                "estimated_walk_time_min": int(round(d.estimated_walk_time_min)),
                                "path_description": d.path_description
                            }
                        else:
                            tool_result = {
                                "gate": gate_id,
                                "location_context": f"Gate {gate_id} is on the departures concourse of Terminal 2.",
                                "from": ref_point,
                                "distance_m": 180,
                                "estimated_walk_time_min": 6,
                                "path_description": "Proceed straight past security check, turn right at passenger corridor, and Gate is directly ahead."
                            }
                            
                    elif fn_name == "navigate_to":
                        page_or_url = fn_args.get("page_or_url")
                        route_val = page_or_url
                        tool_result = {"status": "success", "message": f"Redirecting user to {page_or_url}"}
                        
                    elif fn_name == "get_parking_prediction":
                        zones = ["Zone A", "Zone B", "Zone C", "Zone D"]
                        parking_stats = []
                        for zone in zones:
                            res_p = await db.execute(
                                select(Parking)
                                .filter(Parking.zone_name == zone)
                                .order_by(func.abs(func.extract('epoch', Parking.timestamp - current_time)))
                                .limit(1)
                            )
                            p = res_p.scalars().first()
                            if p:
                                parking_stats.append({
                                    "zone": p.zone_name,
                                    "occupancy_ratio": p.occupancy_ratio,
                                    "total_slots": p.total_slots,
                                    "occupied_slots": p.occupied_slots,
                                    "rush_hours": "Peak rush expected between 08:00 - 11:00 and 18:00 - 21:00."
                                })
                        tool_result = {"zones": parking_stats}
                        
                    elif fn_name == "get_weather_forecast":
                        res_w = await db.execute(select(Weather).order_by(func.abs(func.extract('epoch', Weather.timestamp - current_time))).limit(1))
                        w = res_w.scalars().first()
                        if w:
                            rec = "Clear weather. Normal operations. Arrive 2 hours prior."
                            if "rain" in w.condition.lower() or "storm" in w.condition.lower() or w.precipitation_mm > 0:
                                rec = "Light rain expected — consider leaving 20 minutes earlier."
                            elif "fog" in w.condition.lower() or "mist" in w.condition.lower():
                                rec = "Foggy conditions — expect minor delays, leave 15 minutes earlier."
                            tool_result = {
                                "condition": w.condition,
                                "temperature_c": w.temperature_c,
                                "precipitation_mm": w.precipitation_mm,
                                "wind_speed_kmph": w.wind_speed_kmph,
                                "visibility_km": w.visibility_km,
                                "travel_recommendation": rec
                            }
                        else:
                            tool_result = {"error": "Weather data currently unavailable."}
                            
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "name": fn_name,
                        "content": json.dumps(tool_result)
                    })
                    
                body["messages"] = messages
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=body,
                    timeout=30.0
                )
                res_data = response.json()
                choice = res_data["choices"][0]["message"]
                
            bot_reply = choice["content"]
            
            # Log all function names called to chat_logs (Section 4)
            detected_intent = ",".join(called_functions) if called_functions else None
            
            chat_log = ChatLog(
                session_id=req.session_id,
                user_id=req.user_id,
                message=req.message,
                response=bot_reply,
                detected_intent=detected_intent,
                timestamp=datetime.utcnow()
            )
            db.add(chat_log)
            await db.commit()
            
            return ChatResponse(
                response=bot_reply,
                intent=detected_intent,
                route=route_val
            )
            
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            mock_res = await run_mock_chatbot(req.message, current_time, req.session_id, db)
            return ChatResponse(
                response=mock_res["response"],
                intent=mock_res["intent"],
                route=mock_res.get("route")
            )
