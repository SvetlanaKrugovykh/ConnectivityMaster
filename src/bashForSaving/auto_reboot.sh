#!/bin/sh

LOG_FILE="/var/log/ix0_monitor.log"
LOCK_FILE="/var/run/ix0_monitor.lock"
REBOOT_INTERVAL=3600 # = 1 hour

INTERFACE_CHECK="ix0"
INTERFACE_PING="re0"
GATEWAY_PING="176.124.138.129"  #for 176.124.138.141

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

ifconfig $INTERFACE_CHECK | grep -q "status: no carrier"
if [ $? -eq 0 ]; then
    # ix0 is not active
    log_message "Interface $INTERFACE_CHECK is not active."

    ping -c 3 $GATEWAY_PING > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_message "Gateway $GATEWAY_PING is available throught $INTERFACE_PING."

        if [ -f $LOCK_FILE ]; then
            LAST_REBOOT=$(stat -f "%m" $LOCK_FILE)
            CURRENT_TIME=$(date +%s)
            TIME_DIFF=$(($CURRENT_TIME - $LAST_REBOOT))

            if [ $TIME_DIFF -lt $REBOOT_INTERVAL ]; then
                log_message "Reboot recetly executed. Pass this step."
                exit 0
            fi
        fi

        touch $LOCK_FILE
        log_message "Server rebooting."
        ######/sbin/reboot
    else
        log_message "Gateway $GATEWAY_PING is not available throught $INTERFACE_PING."
    fi
else
    log_message "Interface $INTERFACE_CHECK is active."
fi
